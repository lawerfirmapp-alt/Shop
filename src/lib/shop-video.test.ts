import { describe, expect, it } from "vitest";
import { autoShowWindows, SHOP_VIDEO } from "./shop-video";

describe("shop video", () => {
  it("plays by itself straight away when the shop opens", () => {
    expect(autoShowWindows()[0]?.start).toBe(0);
  });

  it("pops up by itself twice, a few seconds each, with a pause in between", () => {
    expect(autoShowWindows()).toEqual([
      { start: 0, end: 8 },
      { start: 20, end: 28 },
    ]);
  });

  it("after the automatic pop-ups it only plays when pressed", () => {
    expect(SHOP_VIDEO.autoShows).toBe(2);
  });
});
