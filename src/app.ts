import express from 'express';
import twilio from 'twilio';
import type { Agent } from './agent.js';

export interface AppOptions {
  agent: Agent;
  twilioAuthToken?: string;
  validateSignature?: boolean;
  publicUrl?: string;
}

export function createApp(opts: AppOptions) {
  const app = express();
  // Messaging webhooks arrive as form encoded POST bodies.
  app.use(express.urlencoded({ extended: false }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/webhooks/sms', async (req, res) => {
    if (opts.validateSignature) {
      const signature = req.header('X-Twilio-Signature') ?? '';
      const url = (opts.publicUrl ?? '') + req.originalUrl;
      if (!twilio.validateRequest(opts.twilioAuthToken ?? '', signature, url, req.body)) {
        res.status(403).send('Invalid signature');
        return;
      }
    }

    const from = String(req.body.From ?? '');
    const body = String(req.body.Body ?? '');
    if (!from) {
      res.status(400).send('Missing From');
      return;
    }

    const reply = await opts.agent.handle(from, body);

    // Reply inline with TwiML. Works the same for SMS and RCS senders.
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(reply);
    res.type('text/xml').send(twiml.toString());
  });

  return app;
}
