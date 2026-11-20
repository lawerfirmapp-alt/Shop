import { useState, type FormEvent } from "react";
import { Quote, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { TESTIMONIAL_LIMITS } from "@/lib/marketing";
import { cn } from "@/lib/utils";

export interface Testimonial { id: string; name: string; rating: number; message: string; product_id: string | null; created_at: string }

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("flex gap-0.5 text-gold", className)} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cn("size-4", i <= value ? "fill-current" : "opacity-30")} />)}
    </span>
  );
}

export function Testimonials({ items, products }: { items: Testimonial[]; products: { id: string; name: string }[] }) {
  const [rating, setRating] = useState(0);
  const [productId, setProductId] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const productName = (id: string | null) => products.find((p) => p.id === id)?.name;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!rating) { toast.error("Please choose a star rating."); return; }
    setBusy(true);
    const { error } = await supabase.rpc("submit_testimonial", {
      p_name: String(f.get("name") ?? ""),
      p_rating: rating,
      p_message: String(f.get("message") ?? ""),
      ...(productId ? { p_product_id: productId } : {}),
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setDone(true);
  };

  return (
    <section id="reviews" className="bg-cream">
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-10">
        <div className="text-center">
          <p className="eyebrow text-gold">Kind words</p>
          <h2 className="mt-2 text-4xl font-bold">What our customers say</h2>
        </div>
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="grid content-start gap-4 sm:grid-cols-2">
            {items.length === 0 && (
              <p className="border border-dashed border-border bg-card p-8 text-center text-muted-foreground sm:col-span-2">
                No reviews yet. Be the first to share your experience.
              </p>
            )}
            {items.map((t) => (
              <figure key={t.id} className="flex flex-col border border-border bg-card p-6">
                <Quote className="size-6 text-gold/60" aria-hidden />
                <Stars value={t.rating} className="mt-3" />
                <blockquote className="mt-3 flex-1 whitespace-pre-line font-display text-lg leading-relaxed">{t.message}</blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="font-semibold">{t.name}</span>
                  {productName(t.product_id) && <span className="text-muted-foreground"> · {productName(t.product_id)}</span>}
                </figcaption>
              </figure>
            ))}
          </div>

          <div className="border border-border bg-card p-6">
            <h3 className="font-display text-2xl font-semibold">Share your experience</h3>
            {done ? (
              <p className="mt-4 bg-accent p-4 text-sm">Thank you! Your review will appear on the shop once we've read it.</p>
            ) : (
              <form onSubmit={submit} className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="t-name">Your name</Label>
                  <Input id="t-name" name="name" required minLength={2} maxLength={TESTIMONIAL_LIMITS.name} />
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">Your rating</p>
                  <div className="flex gap-1" role="radiogroup" aria-label="Star rating">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i} star${i > 1 ? "s" : ""}`} onClick={() => setRating(i)} className="text-gold">
                        <Star className={cn("size-7 transition-transform hover:scale-110", i <= rating ? "fill-current" : "opacity-40")} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-message">Your message</Label>
                  <Textarea id="t-message" name="message" required minLength={TESTIMONIAL_LIMITS.messageMin} maxLength={TESTIMONIAL_LIMITS.messageMax} rows={4} />
                  <p className="text-xs text-muted-foreground">{TESTIMONIAL_LIMITS.messageMin}–{TESTIMONIAL_LIMITS.messageMax} characters.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-product">Which piece? (optional)</Label>
                  <select id="t-product" value={productId} onChange={(e) => setProductId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">— None —</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <Button type="submit" variant="gold" size="lg" className="w-full" disabled={busy}>{busy ? "Sending…" : "Send review"}</Button>
                <p className="text-xs text-muted-foreground">Reviews are checked by the shop owner before they appear.</p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
