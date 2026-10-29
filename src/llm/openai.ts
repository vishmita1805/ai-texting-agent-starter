import OpenAI from 'openai';
import type { ChatMessage, LLM } from '../agent.js';

export class OpenAILLM implements LLM {
  private client: OpenAI;

  constructor(apiKey: string, private model: string) {
    this.client = new OpenAI({ apiKey });
  }

  async complete(messages: ChatMessage[]): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: this.model,
      messages,
      max_tokens: 300,
    });
    return res.choices[0]?.message?.content ?? '';
  }
}
