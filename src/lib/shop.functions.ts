import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import { isStoredFile, type Department, type Product } from "@/lib/catalog";

// Works on Lovable, Vercel and Netlify: server env vars first, then the public values baked in at build time.
function publicClient() {
  const url = process.env["SUPABASE_URL"] || import.meta.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] || import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("The shop's database address is missing.");
  return createClient<Database>(url, key, {
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

type Sb = ReturnType<typeof publicClient>;

async function loadCatalog(sb: Sb) {
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

/** Shop photos/video are private files; the database lets shoppers open only what is on show. */
async function signLinks(sb: Sb, bucket: string, paths: string[]) {
  if (paths.length === 0) return new Map<string, string>();
  const { data } = await sb.storage.from(bucket).createSignedUrls([...new Set(paths)], 60 * 60 * 24);
  return new Map((data ?? []).filter((d) => d.signedUrl && d.path && !d.error).map((d) => [d.path!, d.signedUrl]));
}

/** Public: shop data. Uploaded photos and the shop video get short-lived view links. */
export const getStorefront = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [catalog, video] = await Promise.all([loadCatalog(sb), sb.rpc("get_shop_video")]);
  const enabled = new Set(catalog.departments.filter((d) => d.enabled).map((d) => d.id));
  const photoPaths = catalog.products
    .filter((p) => enabled.has(p.department))
    .flatMap((p) => [p.image_path, ...(p.gallery ?? [])])
    .filter((x): x is string => !!x && isStoredFile(x));
  const videoPath = video.data ?? null;
  const [photos, videos] = await Promise.all([
    signLinks(sb, "product-photos", photoPaths),
    signLinks(sb, "product-videos", videoPath && isStoredFile(videoPath) ? [videoPath] : []),
  ]);
  const photo = (v: string) => (isStoredFile(v) ? photos.get(v) : v);
  return {
    ...catalog,
    /** The one shop video (not tied to a product), as a viewing link. */
    shopVideo: videoPath ? ((isStoredFile(videoPath) ? videos.get(videoPath) : videoPath) ?? null) : null,
    // Shoppers get the viewing link instead of the storage path.
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

/** Public: shoppers place an order now and pay later. The database re-prices every line and saves the order. */
export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((input: z.input<typeof orderSchema>) => orderSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: res, error } = await publicClient().rpc("place_order", {
      p_customer_name: data.customer_name,
      p_phone: data.phone,
      p_email: data.email ?? "",
      p_address: data.address,
      p_notes: data.notes ?? "",
      p_lines: data.lines,
    });
    if (error) {
      console.error("place_order failed", error);
      // P0001 = a friendly message raised by the order check (sold out, missing size, ...).
      throw new Error(error.code === "P0001" ? error.message : "We couldn't save your order. Please try again.");
    }
    const r = res as { orderNumber: number; total: number };
    return { orderNumber: r.orderNumber, total: Number(r.total) };
  });
