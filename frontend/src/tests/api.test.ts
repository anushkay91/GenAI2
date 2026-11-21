import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getStoredToken, authenticateRole } from '../services/api';

// Polyfill sessionStorage for Node 20 CI environment
if (typeof globalThis.sessionStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.sessionStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => { store.set(key, String(val)); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; },
  } as Storage;
}

describe('Frontend API & Authentication Services', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('retrieves null when no token is stored in sessionStorage', () => {
    expect(getStoredToken()).toBeNull();
  });

  it('stores access token and role upon successful demo authentication', async () => {
    const mockToken = 'mocked.jwt.token.12345';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: mockToken, role: 'officer' })
    } as unknown as Response);

    const token = await authenticateRole('officer');
    expect(token).toBe(mockToken);
    expect(getStoredToken()).toBe(mockToken);
    expect(sessionStorage.getItem('decision_intel_role')).toBe('officer');
  });

  it('handles backend network failure gracefully and returns null', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
    const token = await authenticateRole('analyst');
    expect(token).toBeNull();
  });
});
