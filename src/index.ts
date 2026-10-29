import { config } from './config.js';
import { Agent } from './agent.js';
import { InMemoryStore } from './memory.js';
import { OpenAILLM } from './llm/openai.js';
import { createApp } from './app.js';

if (!config.openaiApiKey) {
  console.error('Missing OPENAI_API_KEY. Copy .env.example to .env and add your key.');
  process.exit(1);
}

const agent = new Agent(
  new OpenAILLM(config.openaiApiKey, config.openaiModel),
  new InMemoryStore(config.maxTurns),
  config.systemPrompt,
);

const app = createApp({
  agent,
  twilioAuthToken: config.twilioAuthToken,
  validateSignature: config.validateSignature,
  publicUrl: config.publicUrl,
});

app.listen(config.port, () => {
  console.log(`AI texting agent listening on http://localhost:${config.port}`);
  console.log('Point your messaging webhook at POST /webhooks/sms');
});
