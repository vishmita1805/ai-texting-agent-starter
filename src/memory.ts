export type Role = 'user' | 'assistant';

export interface Turn {
  role: Role;
  content: string;
  at: number;
}

/** Stores the recent conversation for each phone number (or RCS sender). */
export interface ConversationStore {
  get(conversationId: string): Promise<Turn[]>;
  append(conversationId: string, turn: Turn): Promise<void>;
  reset(conversationId: string): Promise<void>;
}

/**
 * Simple in memory store with a sliding window and an expiry time.
 * Good for local development. Swap in Redis or Postgres for production.
 */
export class InMemoryStore implements ConversationStore {
  private conversations = new Map<string, Turn[]>();

  constructor(
    private maxTurns = 10,
    private ttlMs = 24 * 60 * 60 * 1000,
    private now: () => number = () => Date.now(),
  ) {}

  async get(conversationId: string): Promise<Turn[]> {
    const turns = this.conversations.get(conversationId) ?? [];
    const fresh = turns.filter((t) => this.now() - t.at < this.ttlMs);
    if (fresh.length !== turns.length) this.conversations.set(conversationId, fresh);
    return [...fresh];
  }

  async append(conversationId: string, turn: Turn): Promise<void> {
    const turns = await this.get(conversationId);
    turns.push(turn);
    // Keep the last N user/assistant pairs so prompts stay small.
    this.conversations.set(conversationId, turns.slice(-this.maxTurns * 2));
  }

  async reset(conversationId: string): Promise<void> {
    this.conversations.delete(conversationId);
  }
}
