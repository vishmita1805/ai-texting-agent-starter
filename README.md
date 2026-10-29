# AI Texting Agent Starter Kit

Text an AI agent from your phone. This starter kit connects a large language model to **SMS and RCS** through a messaging API webhook, with conversation memory, safe fallbacks, and tests, so you can go from API key to a working agent in about 15 minutes.

```
 Your phone ──SMS/RCS──▶ Messaging API (Twilio) ──webhook──▶ This app ──▶ LLM (OpenAI)
     ▲                                                          │
     └──────────────────────── reply (TwiML) ◀──────────────────┘
```

## Features

- **One webhook for SMS and RCS.** Inbound messages arrive at `POST /webhooks/sms` and the reply goes back inline as TwiML.
- **Conversation memory per sender.** Each phone number gets its own thread, with a sliding window and an expiry time so prompts stay small.
- **Text friendly replies.** Long answers are trimmed to fit text messages, and empty replies get a friendly fallback.
- **Graceful failures.** If the model is down or rate limited, the user still gets a polite reply instead of silence.
- **`reset` command.** Users can text `reset` or `start over` to clear their conversation.
- **Webhook signature checks.** Turn on `VALIDATE_TWILIO_SIGNATURE` so only real webhook calls are accepted.
- **Pluggable model and storage.** Swap the `LLM` or `ConversationStore` interface for another provider, Redis, or Postgres.
- **TypeScript and Python.** The main app is TypeScript (Express). A matching FastAPI version lives in [`python/`](python/).
- **Tested.** Vitest and Supertest cover threading, reset, failures, trimming, and signature checks.

## Quickstart

You need Node.js 18+, an OpenAI API key, a Twilio account with a phone number, and [ngrok](https://ngrok.com) (or any tunnel).

```bash
git clone https://github.com/<your-username>/ai-texting-agent-starter.git
cd ai-texting-agent-starter
npm install
cp .env.example .env        # add your OPENAI_API_KEY
npm run dev                 # starts on http://localhost:3000
```

In a second terminal, expose your local server:

```bash
ngrok http 3000
```

In the Twilio Console, open your phone number, and under **Messaging, A message comes in**, set the webhook to:

```
https://<your-ngrok-id>.ngrok.app/webhooks/sms   (HTTP POST)
```

Text your Twilio number. The agent replies. 🎉

Full walkthrough: [docs/quickstart.md](docs/quickstart.md)

## Project structure

```
src/
  index.ts        starts the server
  app.ts          Express app and the /webhooks/sms endpoint
  agent.ts        builds prompts, calls the model, trims replies
  memory.ts       per sender conversation store
  llm/openai.ts   OpenAI implementation of the LLM interface
  config.ts       environment variables
python/           FastAPI version of the same agent
test/             Vitest and Supertest tests
docs/             quickstart, tutorial, and blog posts
```

## Configuration

| Variable | Default | What it does |
| --- | --- | --- |
| `OPENAI_API_KEY` | required | Your OpenAI key |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model used for replies |
| `SYSTEM_PROMPT` | short, friendly SMS assistant | The agent's personality and rules |
| `MAX_TURNS` | `10` | How many back and forth turns to remember |
| `VALIDATE_TWILIO_SIGNATURE` | `false` | Reject requests that are not signed by Twilio |
| `TWILIO_AUTH_TOKEN` | | Needed for signature checks |
| `PUBLIC_URL` | | Your public base URL, needed for signature checks |

## Running tests

```bash
npm test
npm run typecheck
```

## Deploying

Build and run with Docker:

```bash
docker build -t ai-texting-agent .
docker run -p 3000:3000 --env-file .env ai-texting-agent
```

Any host that runs a container works (AWS App Runner, ECS, Fly.io, Render). Set `VALIDATE_TWILIO_SIGNATURE=true` and `PUBLIC_URL` in production.

## Learn more

- [Tutorial: build it step by step](docs/tutorial.md)
- [Blog: webhooks, threading, and memory for texting agents](docs/blog/01-webhooks-threading-memory.md)

## Contributing

Issues and pull requests are welcome. Ideas: a Redis store, MMS image support, tool calling, or other messaging providers.

## License

MIT
