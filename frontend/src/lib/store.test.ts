import { describe, expect, it } from "vitest";
import { createStore } from "./store";

describe("createStore", () => {
  it("sets value or updater and notifies subscribers until unsubscribed", () => {
    const s = createStore(1);
    let calls = 0;
    const off = s.subscribe(() => calls++);
    s.set(2);
    s.set((v) => v + 3);
    expect(s.get()).toBe(5);
    off();
    s.set(9);
    expect(calls).toBe(2);
  });
});
