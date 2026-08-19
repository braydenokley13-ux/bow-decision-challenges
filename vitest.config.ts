import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    // Twenty seconds rather than five.
    //
    // Nothing here is slow by accident. Password and card hashing is scrypt at N=2^15, which
    // is deliberately expensive and is the reason a test that seats a class takes seconds
    // rather than milliseconds; the balance harness sweeps a hundred and seventy thousand
    // states to prove no strategy dominates. Both are the point.
    //
    // What five seconds actually measured was how busy the machine was. Under parallel load
    // the same files failed with "Test timed out in 5000ms" and passed alone, which is the
    // worst kind of red: it tells you nothing about the product and it teaches everybody
    // reading the board to discount failures. A timeout should catch a hang, not a queue.
    testTimeout: 20_000,
    hookTimeout: 20_000,
    coverage: { reporter: ["text", "html"] },
  },
});
