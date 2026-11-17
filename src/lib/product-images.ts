import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { isStoredFile, type Product } from "@/lib/catalog";

export const PHOTO_BUCKET = "product-photos";
export const VIDEO_BUCKET = "product-videos";

/** Owner pages: temporary viewing links for uploaded files in a private store. Web links pass through unchanged. */
export function useSignedLinks(bucket: string, values: (string | null | undefined)[]) {
  const paths = [...new Set(values.filter((x): x is string => !!x && isStoredFile(x)))].sort();
  const signed = useQuery({
    queryKey: ["signed-links", bucket, paths],
    enabled: paths.length > 0,
    staleTime: 1000 * 60 * 50,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, 60 * 60 * 24);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((d) => [d.path, d.signedUrl])) as Record<string, string>;
    },
  });
  return (v: string | null | undefined) => (!v ? undefined : isStoredFile(v) ? signed.data?.[v] : v);
}

/** Returns product id -> displayable main photo URL. Uploaded photos get a temporary viewing link. */
export function useProductImages(products: Pick<Product, "id" | "image_url" | "image_path">[]) {
  const link = useSignedLinks(PHOTO_BUCKET, products.map((p) => p.image_path));
  const map: Record<string, string | undefined> = {};
  for (const p of products) map[p.id] = p.image_path ? link(p.image_path) : (p.image_url ?? undefined);
  return map;
}
