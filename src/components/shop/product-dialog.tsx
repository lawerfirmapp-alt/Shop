import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatRand, needsSize, SIZE_SCALE, type Product } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { SizeGuide } from "./size-guide";

export function ProductDialog({
  product, mainImage, onClose, onAdd,
}: {
  product: Product | null;
  mainImage?: string | undefined;
  onClose: () => void;
  onAdd: (p: Product, size: string | undefined, qty: number) => void;
}) {
  const [active, setActive] = useState(0);
  const [size, setSize] = useState<string>();
  const [qty, setQty] = useState(1);
  const [guide, setGuide] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setActive(0);
    setSize(undefined);
    setQty(1);
    setError("");
  }, [product?.id]);

  if (!product) return null;
  const media = [mainImage, ...(product.gallery ?? [])].filter((x): x is string => !!x);
  const current = media[active] ?? media[0];
  const sized = needsSize(product);
  const available = new Set(product.sizes ?? []);
  const scale = [...SIZE_SCALE, ...(product.sizes ?? []).filter((s) => !(SIZE_SCALE as readonly string[]).includes(s))];

  const add = () => {
    if (sized && !size) {
      setError("Please choose a size.");
      return;
    }
    onAdd(product, size, qty);
    onClose();
  };

  return (
    <>
      <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-4xl">
          <div className="grid md:grid-cols-2">
            <div className="bg-muted">
              <div className="aspect-[4/5] overflow-hidden">
                {current && <img src={current} alt={product.name} className="size-full object-cover" />}
              </div>
              {media.length > 1 && (
                <div className="flex gap-2 overflow-x-auto p-3">
                  {media.map((m, i) => (
                    <button
                      key={m + i}
                      onClick={() => setActive(i)}
                      aria-label={`Photo ${i + 1}`}
                      className={cn("relative h-20 w-16 shrink-0 overflow-hidden border-2 bg-card", i === active ? "border-gold" : "border-transparent")}
                    >
                      <img src={m} alt="" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col p-6 md:p-8">
              <p className="eyebrow text-gold">{product.fabric} · {product.origin}</p>
              <DialogTitle className="mt-2 font-display text-3xl font-bold leading-tight">{product.name}</DialogTitle>
              <DialogDescription className="sr-only">Choose a size and add {product.name} to your bag.</DialogDescription>
              <p className="mt-3 text-xl font-semibold">{formatRand(product.price)}</p>

              {sized && (
                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm">Size:{size && <span className="ml-1 font-semibold">{size}</span>}</p>
                    <button onClick={() => setGuide(true)} className="text-xs font-semibold uppercase tracking-[0.15em] underline underline-offset-4 hover:text-gold">
                      Size guide
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
                    {scale.map((s) => {
                      const ok = available.has(s);
                      return (
                        <button
                          key={s}
                          role="radio"
                          aria-checked={size === s}
                          aria-label={ok ? s : `${s} sold out`}
                          disabled={!ok}
                          onClick={() => { setSize(s); setError(""); }}
                          className={cn(
                            "min-w-12 border px-3 py-2.5 text-sm transition-colors",
                            ok ? "border-transparent hover:border-gold" : "cursor-not-allowed text-muted-foreground/60 line-through",
                            size === s && "border-foreground font-semibold",
                          )}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-6">
                <p className="text-sm">Quantity:</p>
                <div className="mt-2 inline-flex items-center border border-border">
                  <Button variant="ghost" size="icon" aria-label="Less" onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus /></Button>
                  <span className="w-8 text-center">{qty}</span>
                  <Button variant="ghost" size="icon" aria-label="More" onClick={() => setQty((q) => Math.min(20, q + 1))}><Plus /></Button>
                </div>
              </div>

              {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
              <Button variant="gold" size="xl" className="mt-6 w-full" onClick={add}>Add to bag</Button>
              <p className="mt-4 text-xs text-muted-foreground">No payment is taken now — we'll confirm your order with you first.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <SizeGuide open={guide} onOpenChange={setGuide} productName={product.name} />
    </>
  );
}
