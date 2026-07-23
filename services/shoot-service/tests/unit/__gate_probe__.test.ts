import { describe, it, expect } from 'vitest';
// TEMPORARY probe to prove the pre-commit gate fails on a red unit test.
describe('gate probe', () => {
  it('should fail on purpose', () => {
    expect(1 + 1).toBe(3);
  });
});
