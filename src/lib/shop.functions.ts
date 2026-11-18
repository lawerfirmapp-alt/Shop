import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database, Json } from "@/integrations/supabase/types";
import { isStoredFile, priceOrder, type Department, type Product } from "@/lib/catalog";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function loadCatalog() {
  const sb = publicClient();
  const [d, p] = await Promise.all([
    sb.from("departments").select("id, label, enabled, sort_order").order("sort_order"),
    sb
      .from("products")
      .select("id, name, department, fabric, origin, price, tag, image_url, image_path, gallery, sizes, is_new_arrival, is_active, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
  ]);
  if (d.error) throw new Error(d.error.message);
  if (p.error) throw new Error(p.error.message);
  return {
    departments: d.data as Department[],
    products: (p.data ?? []).map((x) => ({ ...x, price: Number(x.price) })) as Product[],
  };
}

async function signLinks(bucket: string, paths: string[]) {
  if (paths.length === 0) return new Map<string, string>();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from(bucket).createSignedUrls([...new Set(paths)], 60 * 60 * 24);
  return new Map((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path!, d.signedUrl]));
}

/** Public: shop data. Uploaded photos and the shop video get short-lived view links. */
export const getStorefront = createServerFn({ method: "GET" }).handler(async () => {
  const catalog = await loadCatalog();
  const photoPaths = catalog.products.flatMap((p) => [p.image_path, ...(p.gallery ?? [])]).filter((x): x is string => !!x && isStoredFile(x));
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: settings } = await supabaseAdmin.from("shop_settings").select("video").eq("id", 1).maybeSingle();
  const videoPath = settings?.video ?? null;
  const [photos, videos] = await Promise.all([
    signLinks("product-photos", photoPaths),
    signLinks("product-videos", videoPath && isStoredFile(videoPath) ? [videoPath] : []),
  ]);
  const photo = (v: string) => (isStoredFile(v) ? photos.get(v) : v);
  return {
    ...catalog,
    /** The one shop video (not tied to a product), as a viewing link. */
    shopVideo: videoPath ? ((isStoredFile(videoPath) ? videos.get(videoPath) : videoPath) ?? null) : null,
    // Shoppers cannot sign links themselves; hand them the link instead of the storage path.
    products: catalog.products.map((p) => ({
      ...p,
      image_url: p.image_path ? (photos.get(p.image_path) ?? null) : p.image_url,
      image_path: null,
      gallery: (p.gallery ?? []).map(photo).filter((x): x is string => !!x),
    })),
  };
});

const orderSchema = z.object({
  customer_name: z.string().trim().min(2, "Please enter your name").max(100),
  phone: z.string().trim().min(7, "Please enter a phone number").max(20),
  email: z.string().trim().email("Please enter a valid email").max(255).optional().or(z.literal("")),
  address: z.string().trim().min(5, "Please enter a delivery address").max(500),
  notes: z.string().trim().max(500).optional(),
  lines: z
    .array(z.object({ productId: z.string().uuid(), qty: z.number().int().min(1).max(20), size: z.string().max(10).optional() }))
    .min(1)
    .max(50),
});

/** Public: shoppers place an order now and pay once the payment system is connected. */
export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((input: z.input<typeof orderSchema>) => orderSchema.parse(input))
  .handler(async ({ data }) => {
    const { products, departments } = await loadCatalog();
    const { lines, total } = priceOrder(data.lines, products, departments);
    // Shoppers cannot read or write orders directly; the order is written here after pricing.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: data.customer_name,
        phone: data.phone,
        email: data.email || null,
        address: data.address,
        notes: data.notes || null,
        items: lines as unknown as Json,
        total,
      })
      .select("order_number")
      .single();
    if (error) throw new Error("We couldn't save your order. Please try again.");
    return { orderNumber: row.order_number, total };
  });
