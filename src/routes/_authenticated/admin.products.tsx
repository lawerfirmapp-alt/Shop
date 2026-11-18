import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { formatRand, isStoredFile, SIZE_SCALE, type Product } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { adminDepartmentsQuery, adminProductsQuery } from "@/lib/admin-data";
import { PHOTO_BUCKET, useProductImages, useSignedLinks } from "@/lib/product-images";

export const Route = createFileRoute("/_authenticated/admin/products")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(adminProductsQuery),
      context.queryClient.ensureQueryData(adminDepartmentsQuery),
    ]),
  component: ProductsAdmin,
});

type Draft = {
  id?: string;
  name: string;
  department: string;
  fabric: string;
  origin: string;
  price: string;
  tag: string;
  is_new_arrival: boolean;
  is_active: boolean;
  image_path: string | null;
  image_url: string | null;
  sizes: string[];
  gallery: string[];
};

const MAX_PHOTO = 10 * 1024 * 1024;
const ext = (f: File, fallback: string) => f.name.split(".").pop()?.toLowerCase() || fallback;

const empty: Draft = {
  name: "", department: "women", fabric: "Ankara", origin: "South Africa", price: "", tag: "",
  is_new_arrival: true, is_active: true, image_path: null, image_url: null,
  sizes: ["S", "M", "L", "XL", "1XL", "2XL"], gallery: [],
};

function ProductsAdmin() {
  const qc = useQueryClient();
  const { data: products } = useSuspenseQuery(adminProductsQuery);
  const { data: departments } = useSuspenseQuery(adminDepartmentsQuery);
  const images = useProductImages(products);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [show, setShow] = useState<"all" | "new" | "hidden">("all");
  const [extraFiles, setExtraFiles] = useState<{ file: File; preview: string }[]>([]);
  const [removed, setRemoved] = useState<{ bucket: string; path: string }[]>([]);
  const photoLink = useSignedLinks(PHOTO_BUCKET, draft?.gallery ?? []);
  const dropStored = (bucket: string, v: string | null | undefined) => {
    if (v && isStoredFile(v)) setRemoved((r) => [...r, { bucket, path: v }]);
  };

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "products"] });

  const open = (p?: Product) => {
    setFile(null);
    setExtraFiles([]);
    setRemoved([]);
    setPreview(p ? (images[p.id] ?? null) : null);
    setDraft(
      p
        ? { id: p.id, name: p.name, department: p.department, fabric: p.fabric, origin: p.origin, price: String(p.price), tag: p.tag,
            is_new_arrival: p.is_new_arrival, is_active: p.is_active ?? true, image_path: p.image_path, image_url: p.image_url,
            sizes: p.sizes ?? [], gallery: p.gallery ?? [] }
        : { ...empty },
    );
  };

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const price = Number(d.price);
      if (!d.name.trim()) throw new Error("Please add a product name");
      if (!Number.isFinite(price) || price < 0) throw new Error("Please add a valid price");
      let image_path = d.image_path;
      const upload = async (bucket: string, f: File, fallback: string) => {
        const path = `${crypto.randomUUID()}.${ext(f, fallback)}`;
        const up = await supabase.storage.from(bucket).upload(path, f, { contentType: f.type });
        if (up.error) throw up.error;
        return path;
      };
      const stale = [...removed];
      if (file) {
        if (d.image_path) stale.push({ bucket: PHOTO_BUCKET, path: d.image_path });
        image_path = await upload(PHOTO_BUCKET, file, "jpg");
      }
      const gallery = [...d.gallery];
      for (const x of extraFiles) gallery.push(await upload(PHOTO_BUCKET, x.file, "jpg"));
      const sizes = SIZE_SCALE.filter((s) => d.sizes.includes(s));
      const row = {
        name: d.name.trim(), department: d.department, fabric: d.fabric.trim(), origin: d.origin.trim(), price,
        tag: d.tag.trim(), is_new_arrival: d.is_new_arrival, is_active: d.is_active, image_path, gallery, sizes,
      };
      const res = d.id ? await supabase.from("products").update(row).eq("id", d.id) : await supabase.from("products").insert(row);
      if (res.error) throw res.error;
      const paths = stale.map((x) => x.path);
      if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths);
    },
    onSuccess: () => {
      toast.success("Product saved");
      setDraft(null);
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const quick = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<Product, "is_new_arrival" | "is_active">> }) => {
      const { error } = await supabase.from("products").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (p: Product) => {
      const { error } = await supabase.from("products").delete().eq("id", p.id);
      if (error) throw error;
      const photos = [p.image_path, ...(p.gallery ?? [])].filter((x): x is string => !!x && isStoredFile(x));
      if (photos.length) await supabase.storage.from(PHOTO_BUCKET).remove(photos);
    },
    onSuccess: () => {
      toast.success("Product deleted");
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const list = products.filter((p) => (show === "new" ? p.is_new_arrival : show === "hidden" ? !p.is_active : true));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-gold">Catalogue</p>
          <h1 className="mt-1 text-4xl font-bold">Products & photos</h1>
        </div>
        <Button variant="gold" size="xl" onClick={() => open()}><Plus /> Add product</Button>
      </div>

      <div className="mt-6 flex gap-2">
        {(["all", "new", "hidden"] as const).map((f) => (
          <Button key={f} variant="chip" size="sm" className="rounded-full px-4" data-active={show === f} onClick={() => setShow(f)}>
            {f === "all" ? `All (${products.length})` : f === "new" ? "New arrivals" : "Hidden"}
          </Button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((p) => (
          <article key={p.id} className="flex gap-4 border border-border bg-card p-3">
            <div className="h-28 w-22 shrink-0 overflow-hidden bg-muted">
              {images[p.id] && <img src={images[p.id]} alt={p.name} className="size-full object-cover" />}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-gold">
                {departments.find((d) => d.id === p.department)?.label} · {p.fabric}
              </p>
              <h3 className="truncate font-display text-lg font-semibold">{p.name}</h3>
              <p className="text-sm font-semibold">{formatRand(p.price)}</p>
              <p className="text-xs text-muted-foreground">
                {1 + (p.gallery?.length ?? 0)} photo{(p.gallery?.length ?? 0) ? "s" : ""}
                {p.sizes?.length ? ` · ${p.sizes.join(", ")}` : " · one size"}
              </p>
              <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-xs">
                <label className="flex items-center gap-1.5">
                  <Switch checked={p.is_new_arrival} onCheckedChange={(v) => quick.mutate({ id: p.id, patch: { is_new_arrival: v } })} /> New
                </label>
                <label className="flex items-center gap-1.5">
                  <Switch checked={p.is_active ?? true} onCheckedChange={(v) => quick.mutate({ id: p.id, patch: { is_active: v } })} /> In shop
                </label>
                <div className="ml-auto flex gap-1">
                  <Button variant="ghost" size="icon" className="size-7" aria-label={`Edit ${p.name}`} onClick={() => open(p)}><Pencil /></Button>
                  <Button
                    variant="ghost" size="icon" className="size-7 text-destructive" aria-label={`Delete ${p.name}`}
                    onClick={() => confirm(`Delete "${p.name}"?`) && remove.mutate(p)}
                  ><Trash2 /></Button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
      {list.length === 0 && <p className="py-16 text-center text-muted-foreground">Nothing here yet.</p>}

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{draft?.id ? "Edit product" : "Add product"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <form id="product-form" className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(draft); }}>
              <label className="flex cursor-pointer items-center gap-4 border border-dashed border-border p-3 hover:border-gold">
                <div className="grid h-28 w-22 shrink-0 place-items-center overflow-hidden bg-muted">
                  {preview ? <img src={preview} alt="" className="size-full object-cover" /> : <ImagePlus className="size-6 text-muted-foreground" />}
                </div>
                <div className="text-sm">
                  <p className="font-semibold">{preview ? "Change photo" : "Upload photo"}</p>
                  <p className="text-muted-foreground">JPG or PNG, up to 10 MB</p>
                </div>
                <input
                  type="file" accept="image/*" className="sr-only" aria-label="Product photo"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > MAX_PHOTO) {
                      toast.error("Photo is larger than 10 MB");
                      return;
                    }
                    setFile(f);
                    setPreview(URL.createObjectURL(f));
                  }}
                />
              </label>
              <div className="space-y-1.5">
                <Label>More photos</Label>
                <div className="flex flex-wrap gap-2">
                  {draft.gallery.map((g) => (
                    <div key={g} className="relative h-24 w-19 overflow-hidden bg-muted">
                      {photoLink(g) && <img src={photoLink(g)} alt="" className="size-full object-cover" />}
                      <button
                        type="button" aria-label="Remove photo"
                        className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-background/90"
                        onClick={() => { dropStored(PHOTO_BUCKET, g); setDraft({ ...draft, gallery: draft.gallery.filter((x) => x !== g) }); }}
                      ><X className="size-3" /></button>
                    </div>
                  ))}
                  {extraFiles.map((x) => (
                    <div key={x.preview} className="relative h-24 w-19 overflow-hidden bg-muted">
                      <img src={x.preview} alt="" className="size-full object-cover" />
                      <button
                        type="button" aria-label="Remove photo"
                        className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-background/90"
                        onClick={() => setExtraFiles(extraFiles.filter((y) => y !== x))}
                      ><X className="size-3" /></button>
                    </div>
                  ))}
                  <label className="grid h-24 w-19 cursor-pointer place-items-center border border-dashed border-border text-muted-foreground hover:border-gold">
                    <Plus className="size-5" />
                    <input
                      type="file" accept="image/*" multiple className="sr-only" aria-label="Add more photos"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        e.target.value = "";
                        if (files.some((f) => f.size > MAX_PHOTO)) toast.error("Photos must be under 10 MB each");
                        setExtraFiles([...extraFiles, ...files.filter((f) => f.size <= MAX_PHOTO).map((f) => ({ file: f, preview: URL.createObjectURL(f) }))]);
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Sizes in stock <span className="font-normal text-muted-foreground">(crossed-out sizes show as sold out)</span></Label>
                <div className="flex flex-wrap gap-1.5">
                  {SIZE_SCALE.map((sz) => {
                    const on = draft.sizes.includes(sz);
                    return (
                      <button
                        key={sz} type="button" aria-pressed={on}
                        onClick={() => setDraft({ ...draft, sizes: on ? draft.sizes.filter((x) => x !== sz) : [...draft.sizes, sz] })}
                        className={cn("min-w-11 border px-2.5 py-1.5 text-sm", on ? "border-gold bg-gold text-gold-foreground" : "border-border text-muted-foreground line-through")}
                      >{sz}</button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Turn all sizes off for one-size items like bags and jewellery.</p>
              </div>

              <Field label="Name"><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Department">
                  <Select value={draft.department} onValueChange={(v) => setDraft({ ...draft, department: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.label}{d.enabled ? "" : " (closed)"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Price (R)"><Input type="number" min={0} step="1" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} required /></Field>
                <Field label="Fabric"><Input value={draft.fabric} onChange={(e) => setDraft({ ...draft, fabric: e.target.value })} /></Field>
                <Field label="Origin"><Input value={draft.origin} onChange={(e) => setDraft({ ...draft, origin: e.target.value })} /></Field>
              </div>
              <Field label="Label on photo (e.g. Bestseller)"><Input value={draft.tag} onChange={(e) => setDraft({ ...draft, tag: e.target.value })} /></Field>
              <div className="flex gap-6 text-sm">
                <label className="flex items-center gap-2"><Switch checked={draft.is_new_arrival} onCheckedChange={(v) => setDraft({ ...draft, is_new_arrival: v })} /> New arrival</label>
                <label className="flex items-center gap-2"><Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} /> Show in shop</label>
              </div>
            </form>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
            <Button variant="gold" type="submit" form="product-form" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save product"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
