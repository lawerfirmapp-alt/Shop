<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

<!-- AGENT-MEMORY:BEGIN -->
- Products, departments, orders and staff live in Lovable Cloud tables; pure shop rules (visibility, pricing, statuses) live in `src/lib/catalog.ts` and are unit-tested. Why: storefront, checkout and admin share one set of rules.
- Storefront reads via `getStorefront` (publishable client, server fn); orders are written only by `placeOrder`, which re-prices from the DB and inserts with the admin client. Why: shoppers have no direct access to the orders table.
- Admin pages use the browser client with RLS gated by `has_role(...,'admin')`; first signup becomes admin via a trigger on auth.users. Why: owner-only admin without a setup step.
- Product photos are in the private `product-photos` bucket (workspace blocks public buckets); only admins can read the bucket directly; `getStorefront` signs shopper photo links server-side and admin pages sign in the browser via `useProductImages`. Sample photos are static files in `public/products/`.
- The one shop video lives in `shop_settings` (single row, owner-only) with the file in the private `product-videos` bucket; `getStorefront` signs it and `ShopVideo` renders it client-only (signed links differ per load). Pop-up timing is in `src/lib/shop-video.ts`, tested. Why: the video belongs to the shop, not a product.
- Shop contact details (address, phone/WhatsApp) live in `src/lib/contact.ts` with `whatsappLink()`; tested. Why: one source for every contact link on the shop.
<!-- AGENT-MEMORY:END -->
