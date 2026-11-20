import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Stars } from "@/components/shop/testimonials";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { adminProductsQuery } from "@/lib/admin-data";
import { formatDateZA, TESTIMONIAL_LIMITS, TESTIMONIAL_STATUSES } from "@/lib/marketing";

interface Review {
  id: string;
  name: string;
  rating: number;
  message: string;
  product_id: string | null;
  status: string;
  created_at: string;
}

const reviewsQuery = queryOptions({
  queryKey: ["admin", "testimonials"],
  queryFn: async () => {
    const r = await supabase.from("testimonials").select("*").order("created_at", { ascending: false });
    if (r.error) throw new Error(r.error.message);
    return (r.data ?? []) as Review[];
  },
});

export const Route = createFileRoute("/_authenticated/admin/testimonials")({
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(reviewsQuery), context.queryClient.ensureQueryData(adminProductsQuery)]),
  component: TestimonialsAdmin,
});

function TestimonialsAdmin() {
  const qc = useQueryClient();
  const { data: reviews } = useSuspenseQuery(reviewsQuery);
  const { data: products } = useSuspenseQuery(adminProductsQuery);
  const [tab, setTab] = useState("pending");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "testimonials"] });
    qc.invalidateQueries({ queryKey: ["admin", "testimonials-pending"] });
    qc.invalidateQueries({ queryKey: ["storefront"] });
  };

  const update = useMutation({
    mutationFn: async (v: { id: string; patch: { status?: string; message?: string }; done: string }) => {
      const { error } = await supabase.from("testimonials").update(v.patch).eq("id", v.id);
      if (error) throw new Error(error.message);
      return v.done;
    },
    onSuccess: (done) => {
      toast.success(done);
      setEditing(null);
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("testimonials").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Review deleted");
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const productName = (id: string | null) => products.find((p) => p.id === id)?.name;
  const count = (status: string) => reviews.filter((r) => r.status === status).length;
  const shown = reviews.filter((r) => r.status === tab);

  return (
    <div>
      <p className="eyebrow text-gold">Reviews</p>
      <h1 className="mt-1 text-4xl font-bold">Testimonials</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        New reviews wait here. Only the ones you approve appear on the shop. You can fix spelling before approving.
      </p>

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList>
          {TESTIMONIAL_STATUSES.map((s) => (
            <TabsTrigger key={s.id} value={s.id}>
              {s.label} ({count(s.id)})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-6 grid max-w-3xl gap-4">
        {shown.length === 0 && <p className="border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">Nothing here.</p>}
        {shown.map((r) => (
          <article key={r.id} className="border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateZA(r.created_at)}
                  {productName(r.product_id) ? ` \u00b7 ${productName(r.product_id)}` : ""}
                </p>
              </div>
              <Stars value={r.rating} />
            </div>

            {editing === r.id ? (
              <div className="mt-3 space-y-2">
                <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} maxLength={TESTIMONIAL_LIMITS.messageMax} />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="gold"
                    disabled={update.isPending || draft.trim().length < TESTIMONIAL_LIMITS.messageMin}
                    onClick={() => update.mutate({ id: r.id, patch: { message: draft.trim() }, done: "Review text saved" })}
                  >
                    Save text
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{r.message}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {r.status !== "approved" && (
                <Button size="sm" variant="gold" disabled={update.isPending} onClick={() => update.mutate({ id: r.id, patch: { status: "approved" }, done: "Approved. It now shows on the shop." })}>
                  <Check /> Approve
                </Button>
              )}
              {r.status === "pending" && (
                <Button size="sm" variant="outline" disabled={update.isPending} onClick={() => update.mutate({ id: r.id, patch: { status: "rejected" }, done: "Rejected" })}>
                  <X /> Reject
                </Button>
              )}
              {r.status === "approved" && (
                <Button size="sm" variant="outline" disabled={update.isPending} onClick={() => update.mutate({ id: r.id, patch: { status: "pending" }, done: "Hidden from the shop" })}>
                  Hide from shop
                </Button>
              )}
              {editing !== r.id && (
                <Button size="sm" variant="ghost" onClick={() => { setEditing(r.id); setDraft(r.message); }}>
                  <Pencil /> Edit text
                </Button>
              )}
              <Button size="sm" variant="ghost" disabled={remove.isPending} onClick={() => confirm("Delete this review for good?") && remove.mutate(r.id)}>
                <Trash2 /> Delete
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
