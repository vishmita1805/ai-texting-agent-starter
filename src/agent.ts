import type { ConversationStore, Turn } from './memory.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Any model provider works as long as it can turn messages into a reply. */
export interface LLM {
  complete(messages: ChatMessage[]): Promise<string>;
}

/** Long replies get split into many SMS segments, so we cap the length. */
export const SMS_MAX_CHARS = 1500;

export function buildMessages(systemPrompt: string, history: Turn[], userText: string): ChatMessage[] {
  return [
    { role: 'system', content: systemPrompt },
    ...history.map((t) => ({ role: t.role, content: t.content })),
    { role: 'user', content: userText },
  ];
}

export function toSms(text: string): string {
  const clean = text.replace(/[ \t]+\n/g, '\n').trim();
  return clean.length > SMS_MAX_CHARS ? clean.slice(0, SMS_MAX_CHARS - 1) + '…' : clean;
}

const RESET_COMMAND = /^(reset|start over)$/i;

export class Agent {
  constructor(
    private llm: LLM,
    private store: ConversationStore,
    private systemPrompt: string,
    private now: () => number = () => Date.now(),
  ) {}

  /** Handles one inbound message and returns the text to send back. */
  async handle(from: string, text: string): Promise<string> {
    const message = text.trim();

    if (RESET_COMMAND.test(message)) {
      await this.store.reset(from);
      return 'Conversation cleared. What can I help with?';
    }
    if (!message) return 'Send me a message and I will reply.';

    const history = await this.store.get(from);

    let reply: string;
    try {
      reply = toSms(await this.llm.complete(buildMessages(this.systemPrompt, history, message)));
    } catch (err) {
      console.error('LLM request failed', err);
      return 'Sorry, I had trouble answering that. Please try again in a moment.';
    }
    if (!reply) reply = 'Sorry, I did not catch that. Could you rephrase?';

    await this.store.append(from, { role: 'user', content: message, at: this.now() });
    await this.store.append(from, { role: 'assistant', content: reply, at: this.now() });
    return reply;
  }
}
