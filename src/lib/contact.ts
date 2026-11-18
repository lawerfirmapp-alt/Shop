/** Shop contact details shown to shoppers. The phone number doubles as the WhatsApp line. */
export const SHOP_CONTACT = {
  addressLines: ["56 Augrabies Street", "71 Stone Forest", "Mooikloof Ridge Estate", "0081"],
  phone: "0615228867",
} as const;

/** Turns a South African local number (0…) into a wa.me chat link (+27…). */
export function whatsappLink(phone: string, message?: string): string {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("0") ? `27${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

export const telLink = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
