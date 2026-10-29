import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { Agent, SMS_MAX_CHARS, type ChatMessage, type LLM } from '../src/agent.js';
import { InMemoryStore } from '../src/memory.js';
import { createApp } from '../src/app.js';

class FakeLLM implements LLM {
  calls: ChatMessage[][] = [];
  constructor(private reply: (msgs: ChatMessage[]) => string | Promise<string>) {}
  async complete(messages: ChatMessage[]) {
    this.calls.push(messages);
    return this.reply(messages);
  }
}

function setup(reply: (msgs: ChatMessage[]) => string | Promise<string> = () => 'Hello there!') {
  const llm = new FakeLLM(reply);
  const agent = new Agent(llm, new InMemoryStore(), 'You are a test bot.');
  return { llm, app: createApp({ agent }) };
}

const sms = (from: string, body: string) => ({ From: from, Body: body });

describe('POST /webhooks/sms', () => {
  it('replies with TwiML containing the model answer', async () => {
    const { app } = setup();
    const res = await request(app).post('/webhooks/sms').type('form').send(sms('+15550001', 'hi'));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/xml');
    expect(res.text).toContain('<Message>Hello there!</Message>');
  });

  it('threads earlier messages into the next prompt', async () => {
    const { app, llm } = setup((msgs) => `turn ${msgs.length}`);
    await request(app).post('/webhooks/sms').type('form').send(sms('+15550001', 'my name is Ana'));
    await request(app).post('/webhooks/sms').type('form').send(sms('+15550001', 'what is my name?'));
    const second = llm.calls[1];
    expect(second.map((m) => m.content)).toEqual([
      'You are a test bot.',
      'my name is Ana',
      'turn 2',
      'what is my name?',
    ]);
  });

  it('clears memory when the user texts reset', async () => {
    const { app, llm } = setup();
    await request(app).post('/webhooks/sms').type('form').send(sms('+15550001', 'remember this'));
    const res = await request(app).post('/webhooks/sms').type('form').send(sms('+15550001', 'RESET'));
    expect(res.text).toContain('Conversation cleared');
    await request(app).post('/webhooks/sms').type('form').send(sms('+15550001', 'hello again'));
    expect(llm.calls.at(-1)).toHaveLength(2);
  });

  it('sends a friendly message when the model fails', async () => {
    const { app } = setup(() => Promise.reject(new Error('rate limited')));
    const res = await request(app).post('/webhooks/sms').type('form').send(sms('+15550001', 'hi'));
    expect(res.status).toBe(200);
    expect(res.text).toContain('Please try again');
  });

  it('trims very long replies to fit text messages', async () => {
    const { app } = setup(() => 'a'.repeat(5000));
    const res = await request(app).post('/webhooks/sms').type('form').send(sms('+15550001', 'essay please'));
    const body = res.text.match(/<Message>(.*)<\/Message>/s)?.[1] ?? '';
    expect(body.length).toBeLessThanOrEqual(SMS_MAX_CHARS);
  });

  it('rejects requests without a sender', async () => {
    const { app } = setup();
    const res = await request(app).post('/webhooks/sms').type('form').send({ Body: 'hi' });
    expect(res.status).toBe(400);
  });

  it('rejects unsigned requests when signature checks are on', async () => {
    const agent = new Agent(new FakeLLM(() => 'x'), new InMemoryStore(), 'bot');
    const app = createApp({ agent, validateSignature: true, twilioAuthToken: 'secret', publicUrl: 'https://example.com' });
    const res = await request(app).post('/webhooks/sms').type('form').send(sms('+15550001', 'hi'));
    expect(res.status).toBe(403);
  });
});
