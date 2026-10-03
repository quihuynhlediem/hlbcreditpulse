import { describe, expect, it } from "vitest";
import { eirText, vnd } from "./format";

describe("format", () => {
  it("formats VND with dot separators", () => {
    expect(vnd(12000000)).toBe("12.000.000 ₫");
  });
  it("formats EIR with a decimal comma", () => {
    expect(eirText(0.125)).toBe("12,5%/năm");
    expect(eirText(0)).toBe("0%");
  });
});
