import { describe, expect, it } from "vitest";
import { buildCampaignHtml, isEmailAudience, previewHtml, subscribersCsv, UNSUBSCRIBE_TAG, type SubscriberRow } from "./marketing";

const base = {
  kind: "new_collection" as const, subject: "Spring Shweshwe", message: "Hello\n\nNew <b>pieces</b> are in.",
  products: [], siteUrl: "https://shop.example/", senderName: "Tsholo R Fashion House",
  shopAddress: "56 Augrabies Street, 71 Stone Forest, Mooikloof Ridge Estate, 0081",
};

describe("campaign email", () => {
  it("always has an unsubscribe link and the shop's name and address", () => {
    const html = buildCampaignHtml(base);
    expect(html).toContain(`href="${UNSUBSCRIBE_TAG}"`);
    expect(html).toContain("Tsholo R Fashion House · 56 Augrabies Street, 71 Stone Forest, Mooikloof Ridge Estate, 0081");
  });
  it("shows the owner's message as text, never as HTML", () => {
    expect(buildCampaignHtml(base)).toContain("New &lt;b&gt;pieces&lt;/b&gt; are in.");
  });
  it("a special shows its end date; a new collection does not", () => {
    expect(buildCampaignHtml({ ...base, kind: "special", endsOn: "2026-11-30" })).toContain("Offer ends 30 November 2026");
    expect(buildCampaignHtml({ ...base, endsOn: "2026-11-30" })).not.toContain("Offer ends");
  });
  it("preview fills in a sample name and hides the real unsubscribe tag", () => {
    expect(previewHtml(buildCampaignHtml(base))).not.toContain("params.");
  });
});

describe("subscribers", () => {
  const row: SubscriberRow = {
    name: "=HYPERLINK(\"x\")", email: "a@b.co", whatsapp: null, status: "confirmed", consent_email: true, consent_whatsapp: false,
    consent_at: "2026-11-20", consent_text: "Agreed", source: "footer", confirmed_at: null, unsubscribed_at: null,
  };
  it("CSV export can't run spreadsheet formulas and keeps quotes safe", () => {
    expect(subscribersCsv([row]).split("\r\n")[1]).toMatch(/^"'=HYPERLINK\(""x""\)"/);
  });
  it("only confirmed people who agreed to email get campaigns", () => {
    expect(isEmailAudience(row)).toBe(true);
    expect(isEmailAudience({ ...row, status: "pending" })).toBe(false);
    expect(isEmailAudience({ ...row, status: "unsubscribed" })).toBe(false);
    expect(isEmailAudience({ ...row, consent_email: false })).toBe(false);
  });
});
