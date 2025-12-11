// Demo user test disabled (extension-only mode)
import { it, expect } from 'vitest';

// import { vi, beforeEach } from 'vitest';
// Mock loadDemoSolves BEFORE importing leetcode.ts
// const demoSolves = [
//   { slug: 'demo-p', title: 'Demo P', timestamp: 123, status: 'Accepted', lang: 'js' },
// ];
// vi.mock('./demo', () => ({
//   loadDemoSolves: vi.fn().mockResolvedValue(demoSolves),
// }));

// beforeEach(() => {
//   // Ensure the env var is defined before module load
//   Object.assign(import.meta.env, { VITE_DEMO_USERNAME: 'leet-tracker-demo-user' });
// });

// it('returns demo solves when username matches demo user', async () => {
//   // Dynamic import so the constant picks up the env var after we set it
//   const { fetchRecentSolves } = await import('./leetcode');

//   const fetchSpy = vi.fn();
//   global.fetch = fetchSpy; // should NOT be called

//   const res = await fetchRecentSolves('leet-tracker-demo-user');
//   expect(res).toEqual(demoSolves);
//   expect(fetchSpy).not.toHaveBeenCalled();
// });

// Placeholder test to keep Vitest happy (requires at least one test per file)
it.skip('demo user tests disabled (extension-only mode)', () => {
  expect(true).toBe(true);
});
