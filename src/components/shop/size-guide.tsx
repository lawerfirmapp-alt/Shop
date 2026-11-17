import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { inchesToCm, SIZE_GUIDE, SIZE_SCALE } from "@/lib/catalog";

export function SizeGuide({ open, onOpenChange, productName }: { open: boolean; onOpenChange: (o: boolean) => void; productName?: string }) {
  const [unit, setUnit] = useState<"in" | "cm">("in");
  const fmt = (n: number) => (unit === "in" ? `${n}″` : `${inchesToCm(n)}`);
  const rows = [
    { key: "bust", label: "Bust" },
    { key: "waist", label: "Waist" },
    { key: "hip", label: "Hip" },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl">Size guide</DialogTitle>
          {productName && <DialogDescription>{productName}</DialogDescription>}
        </DialogHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Measurements in {unit === "in" ? "inches" : "centimetres"}</p>
          <div className="flex gap-2">
            <Button variant="chip" size="sm" className="rounded-sm px-4" data-active={unit === "in"} onClick={() => setUnit("in")}>Inches</Button>
            <Button variant="chip" size="sm" className="rounded-sm px-4" data-active={unit === "cm"} onClick={() => setUnit("cm")}>cm</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-center text-sm">
            <thead>
              <tr className="bg-sand">
                <th className="border border-border px-3 py-3 text-left font-medium">Size</th>
                {SIZE_SCALE.map((s) => <th key={s} className="border border-border px-3 py-3 font-medium">{s}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <th scope="row" className="border border-border px-3 py-3 text-left font-normal">{r.label}</th>
                  {SIZE_SCALE.map((s) => <td key={s} className="border border-border px-3 py-3">{fmt(SIZE_GUIDE[s][r.key])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Measure around the fullest part of your bust and hips, and the narrowest part of your waist. Between sizes? Choose the bigger one, or WhatsApp us for help.
        </p>
      </DialogContent>
    </Dialog>
  );
}
