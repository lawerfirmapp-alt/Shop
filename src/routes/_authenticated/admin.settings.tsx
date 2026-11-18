import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Film, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { adminDepartmentsQuery, adminProductsQuery, adminShopSettingsQuery } from "@/lib/admin-data";
import { isStoredFile } from "@/lib/catalog";
import { useSignedLinks, VIDEO_BUCKET } from "@/lib/product-images";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(adminDepartmentsQuery),
      context.queryClient.ensureQueryData(adminProductsQuery),
      context.queryClient.ensureQueryData(adminShopSettingsQuery),
    ]),
  component: DepartmentsAdmin,
});

function DepartmentsAdmin() {
  const qc = useQueryClient();
  const { data: departments } = useSuspenseQuery(adminDepartmentsQuery);
  const { data: products } = useSuspenseQuery(adminProductsQuery);

  const toggle = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("departments").update({ enabled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.enabled ? "Department is now open in the shop" : "Department closed");
      qc.invalidateQueries({ queryKey: ["admin", "departments"] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <ShopVideoSettings />
      <p className="mt-12 eyebrow text-gold">Shop setup</p>
      <h1 className="mt-1 text-4xl font-bold">Departments</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Open a department once you've added its products. Closed departments show "Soon" in the shop and their products stay hidden.
      </p>
      <div className="mt-6 max-w-xl divide-y divide-border border border-border bg-card">
        {departments.map((d) => {
          const count = products.filter((p) => p.department === d.id && p.is_active).length;
          return (
            <label key={d.id} className="flex cursor-pointer items-center gap-4 px-5 py-4">
              <div className="flex-1">
                <p className="font-display text-xl font-semibold">{d.label}</p>
                <p className="text-sm text-muted-foreground">{count} product{count === 1 ? "" : "s"} · {d.enabled ? "Open" : "Coming soon"}</p>
              </div>
              <Switch checked={d.enabled} aria-label={`Open ${d.label}`} onCheckedChange={(enabled) => toggle.mutate({ id: d.id, enabled })} />
            </label>
          );
        })}
      </div>
    </div>
  );
}

const MAX_VIDEO = 50 * 1024 * 1024;

function ShopVideoSettings() {
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(adminShopSettingsQuery);
  const link = useSignedLinks(VIDEO_BUCKET, [data.video]);
  const [progress, setProgress] = useState(false);

  const replace = useMutation({
    mutationFn: async (file: File | null) => {
      let video: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
        video = `shop-video-${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from(VIDEO_BUCKET).upload(video, file, { contentType: file.type });
        if (up.error) throw up.error;
      }
      const { error } = await supabase.from("shop_settings").upsert({ id: 1, video, updated_at: new Date().toISOString() });
      if (error) throw error;
      if (data.video && isStoredFile(data.video)) await supabase.storage.from(VIDEO_BUCKET).remove([data.video]);
      return video;
    },
    onMutate: () => setProgress(true),
    onSettled: () => setProgress(false),
    onSuccess: (v) => {
      toast.success(v ? "Shop video updated" : "Shop video removed");
      qc.invalidateQueries({ queryKey: ["admin", "shop-settings"] });
      qc.invalidateQueries({ queryKey: ["storefront"] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <section>
      <p className="eyebrow text-gold">Shop video</p>
      <h1 className="mt-1 text-4xl font-bold">Your shop video</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        One video for the whole shop. It pops up in the corner when someone opens the shop, plays for a few seconds, hides,
        pops up once more, then waits behind a "Watch our story" button.
      </p>
      <div className="mt-6 flex max-w-xl flex-wrap items-center gap-4 border border-border bg-card p-4">
        {data.video ? (
          <>
            <video src={link(data.video)} controls playsInline className="h-48 bg-muted" />
            <div className="flex flex-col gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-gold/50 px-3 py-2 text-sm font-semibold hover:bg-accent">
                <Film className="size-4" /> {progress ? "Uploading…" : "Replace video"}
                <VideoInput disabled={progress} onPick={(f) => replace.mutate(f)} />
              </label>
              <Button variant="outline" size="sm" disabled={progress} onClick={() => confirm("Remove the shop video?") && replace.mutate(null)}>
                <Trash2 /> Remove video
              </Button>
            </div>
          </>
        ) : (
          <label className="flex w-full cursor-pointer items-center gap-3 border border-dashed border-border p-4 text-sm hover:border-gold">
            <Film className="size-5 text-muted-foreground" />
            <span><span className="font-semibold">{progress ? "Uploading…" : "Upload shop video"}</span> <span className="text-muted-foreground">· MP4 or MOV, up to 50 MB</span></span>
            <VideoInput disabled={progress} onPick={(f) => replace.mutate(f)} />
          </label>
        )}
      </div>
    </section>
  );
}

function VideoInput({ onPick, disabled }: { onPick: (f: File) => void; disabled: boolean }) {
  return (
    <input
      type="file" accept="video/*" className="sr-only" aria-label="Shop video" disabled={disabled}
      onChange={(e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        if (f.size > MAX_VIDEO) { toast.error("Video is larger than 50 MB"); return; }
        onPick(f);
      }}
    />
  );
}
