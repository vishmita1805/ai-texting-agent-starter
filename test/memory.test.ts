import { describe, expect, it } from 'vitest';
import { InMemoryStore } from '../src/memory.js';

describe('InMemoryStore', () => {
  it('keeps conversations separate per sender', async () => {
    const store = new InMemoryStore();
    await store.append('+15550001', { role: 'user', content: 'hi', at: Date.now() });
    expect(await store.get('+15550001')).toHaveLength(1);
    expect(await store.get('+15550002')).toHaveLength(0);
  });

  it('keeps only the most recent turns', async () => {
    const store = new InMemoryStore(2);
    for (let i = 0; i < 10; i++) {
      await store.append('a', { role: 'user', content: `m${i}`, at: Date.now() });
    }
    const turns = await store.get('a');
    expect(turns).toHaveLength(4);
    expect(turns[3].content).toBe('m9');
  });

  it('drops turns older than the expiry time', async () => {
    let now = 1_000;
    const store = new InMemoryStore(10, 500, () => now);
    await store.append('a', { role: 'user', content: 'old', at: now });
    now = 2_000;
    expect(await store.get('a')).toHaveLength(0);
  });
});
