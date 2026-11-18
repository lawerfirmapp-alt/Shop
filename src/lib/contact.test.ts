import { describe, expect, it } from "vitest";
import { SHOP_CONTACT, whatsappLink } from "./contact";

describe("contact", () => {
  it("WhatsApp link uses the shop phone number with the +27 country code", () => {
    expect(whatsappLink(SHOP_CONTACT.phone)).toBe("https://wa.me/27615228867");
  });

  it("keeps the shop address", () => {
    expect(SHOP_CONTACT.addressLines.join(", ")).toBe("56 Augrabies Street, 71 Stone Forest, Mooikloof Ridge Estate, 0081");
  });
});
