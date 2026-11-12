import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Start every test with an empty page, nobody signed in and the real fetch put back.
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});
