# Texting with AI agents: webhooks, threading, and memory

Chat apps give you conversations for free. Text messages don't. When you put an AI agent behind a phone number, three problems show up right away. Here is how this starter kit handles each one.

## 1. Webhooks: your agent only hears what you're sent

With SMS and RCS, your app does not open a connection to anyone. The messaging provider calls *you*. Every inbound text becomes an HTTP POST to your webhook with the sender in `From` and the text in `Body`.

That has two consequences:

- **Respond fast.** Providers expect a quick answer. Replying inline with TwiML works well for short model calls. For slow tasks, acknowledge right away and send the real answer later through the messaging API.
- **Verify the caller.** A webhook URL is public. Checking the provider's request signature stops anyone else from posting fake messages to your agent.

## 2. Threading: every text arrives alone

A text message has no thread ID. The only stable identifier is the sender's number, so that becomes the conversation key:

```ts
const history = await store.get(from);
```

This is simple, and it also means one person always talks to one conversation. If you need several parallel threads per user (say, support and sales), add a keyword or a separate number per thread.

## 3. Memory: remember enough, but not everything

Sending the entire history to the model on every text gets slow and expensive fast. The starter kit uses two limits:

- **A sliding window.** Only the last N exchanges are sent to the model.
- **An expiry time.** Conversations older than a day are forgotten, which matches how people actually text.

Users can also text `reset` to start fresh. That one command fixes a surprising number of "the bot is confused" moments.

```ts
this.conversations.set(id, turns.slice(-this.maxTurns * 2));
```

## Bonus: design for the phone screen

Models love long answers, but phones don't. A short system prompt rule ("keep replies under 300 characters"), a token limit, and a hard trim keep replies readable and cheap.

## Try it

The full code is in this repo. Clone it, add your keys, and you can text your own AI agent in about 15 minutes. If you build something with it, open an issue and share it.
