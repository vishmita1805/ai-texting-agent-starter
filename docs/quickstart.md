# Quickstart: text an AI agent in 15 minutes

## 1. Get your keys (5 min)

- **OpenAI:** create an API key at platform.openai.com.
- **Twilio:** sign up, then buy or claim a phone number with SMS. Trial accounts can only text verified numbers, so verify your own phone first.

## 2. Run the app (3 min)

```bash
npm install
cp .env.example .env
```

Open `.env` and paste your key:

```
OPENAI_API_KEY=sk-...
```

Start the server:

```bash
npm run dev
```

Check it is alive: open http://localhost:3000/health and you should see `{"ok":true}`.

## 3. Make it reachable (2 min)

Twilio needs a public URL to send messages to. Start a tunnel:

```bash
ngrok http 3000
```

Copy the `https://...ngrok.app` address.

## 4. Connect the webhook (3 min)

1. In the Twilio Console, go to **Phone Numbers, Manage, Active numbers** and pick your number.
2. Under **Messaging Configuration, A message comes in**, choose **Webhook**.
3. Paste `https://<your-ngrok-id>.ngrok.app/webhooks/sms` and set the method to **HTTP POST**.
4. Save.

## 5. Text it (2 min)

Send any message to your Twilio number. Try:

- `What's a good name for a coffee shop?`
- `Make it shorter`  (it remembers the last answer)
- `reset`  (clears the conversation)

## Using RCS

If your Twilio Messaging Service has an RCS sender, point the Messaging Service webhook at the same URL. Inbound RCS messages use the same `From` and `Body` fields, so no code changes are needed.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| No reply at all | Check the ngrok terminal for a `POST /webhooks/sms` request. If none, the webhook URL is wrong. |
| `403 Invalid signature` | Set `PUBLIC_URL` to your exact ngrok URL, or turn `VALIDATE_TWILIO_SIGNATURE` off locally. |
| "Sorry, I had trouble answering" | Your OpenAI key is missing, wrong, or out of credit. Check the server logs. |
| Trial account errors | Twilio trial numbers can only text verified phone numbers. |
