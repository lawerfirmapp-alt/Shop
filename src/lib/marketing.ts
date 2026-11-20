/** Rules for testimonials, subscribers and campaign emails. Sending itself happens in the database. */

export const TESTIMONIAL_LIMITS = { name: 60, messageMin: 10, messageMax: 600 } as const;
export const TESTIMONIAL_STATUSES = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
] as const;

export const SUBSCRIBER_STATUSES = [
  { id: "pending", label: "Pending" },
  { id: "confirmed", label: "Confirmed" },
  { id: "unsubscribed", label: "Unsubscribed" },
] as const;

export const CAMPAIGN_KINDS = [
  { id: "new_collection", label: "New collection" },
  { id: "special", label: "Special offer" },
] as const;
export type CampaignKind = (typeof CAMPAIGN_KINDS)[number]["id"];

/** Placeholders the email service fills in for each person. Every campaign must contain UNSUBSCRIBE_TAG. */
export const NAME_TAG = "{{ params.name }}";
export const UNSUBSCRIBE_TAG = "{{ params.unsubscribe_url }}";

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export const formatDateZA = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });

export interface CampaignEmailInput {
  kind: CampaignKind;
  subject: string;
  message: string;
  imageUrl?: string | null | undefined;
  products: { name: string; price: string; url: string }[];
  endsOn?: string | null | undefined;
  siteUrl: string;
  senderName: string;
  shopAddress: string;
}

/** Builds the campaign email. It always names the shop, shows its address and has a one-click unsubscribe link (POPIA). */
export function buildCampaignHtml(c: CampaignEmailInput) {
  const site = c.siteUrl.replace(/\/+$/, "");
  const label = CAMPAIGN_KINDS.find((k) => k.id === c.kind)?.label ?? "News";
  const paragraphs = c.message
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((p) => `<p style="font-size:16px;line-height:1.6;margin:0 0 14px">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const image = c.imageUrl
    ? `<img src="${escapeHtml(c.imageUrl)}" alt="" width="504" style="display:block;width:100%;max-width:504px;height:auto;margin:0 0 20px">`
    : "";
  const ends =
    c.kind === "special" && c.endsOn
      ? `<p style="font-size:15px;font-weight:bold;color:#b8735a;margin:0 0 16px">Offer ends ${escapeHtml(formatDateZA(c.endsOn))}</p>`
      : "";
  const products = c.products.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;border-top:1px solid #ead6cc">${c.products
        .map(
          (p) =>
            `<tr><td style="padding:10px 0;border-bottom:1px solid #ead6cc;font-size:15px">${escapeHtml(p.name)}<br><span style="color:#8a6f63">${escapeHtml(p.price)}</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #ead6cc"><a href="${escapeHtml(p.url)}" style="color:#b8735a;font-family:Arial,sans-serif;font-weight:bold;font-size:14px">View</a></td></tr>`,
        )
        .join("")}</table>`
    : "";
  return `<div style="background:#fbeee8;padding:24px 12px;font-family:Georgia,'Times New Roman',serif;color:#4a3328">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #ead6cc;padding:28px">
<a href="${escapeHtml(site)}"><img src="${escapeHtml(site)}/brand/tsholo-r-fashion-house-logo.png" alt="${escapeHtml(c.senderName)}" width="200" style="display:block;margin:0 auto 20px;max-width:200px;height:auto;border:0"></a>
<p style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#b8735a;text-align:center;margin:0 0 6px">${escapeHtml(label)}</p>
<h1 style="font-size:26px;line-height:1.25;text-align:center;margin:0 0 20px">${escapeHtml(c.subject)}</h1>
${image}<p style="font-size:16px;line-height:1.6;margin:0 0 14px">Hi ${NAME_TAG},</p>
${paragraphs}${ends}${products}
<p style="text-align:center;margin:24px 0 8px"><a href="${escapeHtml(site)}" style="background:#b8735a;color:#ffffff;text-decoration:none;padding:14px 28px;font-family:Arial,sans-serif;font-weight:bold;display:inline-block">Visit the shop</a></p>
<hr style="border:none;border-top:1px solid #ead6cc;margin:24px 0">
<p style="font-size:12px;line-height:1.6;color:#8a6f63;text-align:center;margin:0">You are receiving this because you subscribed to news from ${escapeHtml(c.senderName)}.<br>${escapeHtml(c.senderName)} · ${escapeHtml(c.shopAddress)}<br><a href="${UNSUBSCRIBE_TAG}" style="color:#b8735a">Unsubscribe</a> at any time, free of charge.</p>
</div></div>`;
}

/** What the owner sees in the preview: placeholders filled with sample values. */
export const previewHtml = (html: string) => html.split(NAME_TAG).join("Thandi").split(UNSUBSCRIBE_TAG).join("#");

export interface SubscriberRow {
  name: string;
  email: string | null;
  whatsapp: string | null;
  status: string;
  consent_email: boolean;
  consent_whatsapp: boolean;
  consent_at: string;
  consent_text: string | null;
  source: string;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
}

const csvCell = (v: unknown) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // stop spreadsheets running it as a formula
  return `"${s.replace(/"/g, '""')}"`;
};

export function subscribersCsv(rows: SubscriberRow[]) {
  const head = ["Name", "Email", "WhatsApp", "Status", "Email consent", "WhatsApp consent", "Consent date", "Consent wording", "Signed up via", "Confirmed", "Unsubscribed"];
  const body = rows.map((r) =>
    [r.name, r.email, r.whatsapp, r.status, r.consent_email ? "Yes" : "No", r.consent_whatsapp ? "Yes" : "No", r.consent_at, r.consent_text, r.source, r.confirmed_at, r.unsubscribed_at]
      .map(csvCell)
      .join(","),
  );
  return [head.map(csvCell).join(","), ...body].join("\r\n");
}

/** Only confirmed people who agreed to email get campaigns. */
export const isEmailAudience = (s: Pick<SubscriberRow, "status" | "consent_email" | "email">) =>
  s.status === "confirmed" && s.consent_email && !!s.email;
