import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Heavy integration-style tests (full course generation + .imscc zip build +
    // QTI parse) can blow past vitest's 5000ms default under cold-cache,
    // parallel-fork load — exactly the condition CI runs in — which surfaced as
    // intermittent "Test timed out in 5000ms" flakes in the deploy gate. Give the
    // whole suite generous headroom so transform-storm CPU starvation can't trip it.
    testTimeout: 30000
  }
});
