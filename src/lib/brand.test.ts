import { describe, expect, it } from "vitest";
import { googleSignInAvailable } from "./brand";

describe("googleSignInAvailable", () => {
  it("is on for Lovable addresses", () => {
    expect(googleSignInAvailable("tsholo-ankara-accessory-boutique.lovable.app")).toBe(true);
    expect(googleSignInAvailable("id-preview--abc.lovable.app")).toBe(true);
  });
  it("is off for Vercel and Netlify", () => {
    expect(googleSignInAvailable("tsholo.vercel.app")).toBe(false);
    expect(googleSignInAvailable("tsholo.netlify.app")).toBe(false);
    expect(googleSignInAvailable("lovable.app.evil.com")).toBe(false);
  });
});
