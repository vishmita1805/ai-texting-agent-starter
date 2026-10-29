# Tutorial: build an AI texting agent step by step

This tutorial walks through how the starter kit works, one piece at a time, so you can change it with confidence.

## Step 1: Receive a text with a webhook

When someone texts your number, the messaging provider sends an HTTP POST to your server. The body is form encoded and includes:

- `From`: the sender, like `+15551234567`
- `Body`: the message text

```ts
app.use(express.urlencoded({ extended: false }));

app.post('/webhooks/sms', async (req, res) => {
  const from = String(req.body.From ?? '');
  const body = String(req.body.Body ?? '');
  // ...
});
```

## Step 2: Reply with TwiML

The fastest way to reply is to answer the webhook directly with TwiML, a small XML format:

```ts
const twiml = new twilio.twiml.MessagingResponse();
twiml.message('Hello from your agent!');
res.type('text/xml').send(twiml.toString());
```

At this point you have a working echo bot. Text it and you get a reply.

## Step 3: Add the model

The `LLM` interface keeps the agent independent of any one provider:

```ts
export interface LLM {
  complete(messages: ChatMessage[]): Promise<string>;
}
```

`src/llm/openai.ts` implements it with OpenAI's chat completions API. To use another model, write a new class with the same `complete` method.

## Step 4: Remember the conversation

SMS has no built in threads. Every message arrives on its own, so the agent has to remember context itself. The sender's phone number becomes the conversation ID:

```ts
const history = await store.get(from);
const messages = buildMessages(systemPrompt, history, text);
```

`InMemoryStore` keeps the last `MAX_TURNS` exchanges and drops anything older than 24 hours. That keeps prompts small and costs predictable.

## Step 5: Make replies fit a phone

Texts over 160 characters are split into segments, and very long replies are expensive and hard to read. The agent:

- asks the model for short answers in the system prompt
- limits `max_tokens`
- trims anything over 1,500 characters

## Step 6: Fail gracefully

Models time out and hit rate limits. Instead of leaving the user on read, the agent catches errors and sends a friendly message. The failed turn is not saved, so the conversation stays clean.

## Step 7: Secure the webhook

Anyone who finds your URL could post fake messages. With `VALIDATE_TWILIO_SIGNATURE=true`, the app checks the `X-Twilio-Signature` header against your auth token and rejects anything unsigned.

## Step 8: Test it

The tests replace the real model with a `FakeLLM`, so they run fast and free:

```ts
const llm = new FakeLLM(() => 'Hello there!');
const app = createApp({ agent: new Agent(llm, new InMemoryStore(), 'You are a test bot.') });
await request(app).post('/webhooks/sms').type('form').send({ From: '+15550001', Body: 'hi' });
```

## Where to go next

- Store conversations in Redis or Postgres so they survive restarts.
- Add tool calling so the agent can look up orders or book appointments.
- Send replies asynchronously through the messaging API for long running tasks.
- Track usage: messages per day, reply latency, and failed model calls.
