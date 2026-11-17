import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatRand, ORDER_STATUSES, statusLabel } from "@/lib/catalog";
import { adminOrdersQuery } from "@/lib/admin-data";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  loader: ({ context }) => context.queryClient.ensureQueryData(adminOrdersQuery),
  component: OrdersAdmin,
});

function OrdersAdmin() {
  const qc = useQueryClient();
  const { data: orders } = useSuspenseQuery(adminOrdersQuery);
  const [filter, setFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(`Order marked ${statusLabel(v.status).toLowerCase()}`);
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const list = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div>
      <p className="eyebrow text-gold">Sales</p>
      <h1 className="mt-1 text-4xl font-bold">Orders</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Shoppers place orders from the bag and pay later. Once the payment system is connected, paid orders will update automatically.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {[{ id: "all", label: "All" }, ...ORDER_STATUSES].map((s) => (
          <Button key={s.id} variant="chip" size="sm" className="rounded-full px-4" data-active={filter === s.id} onClick={() => setFilter(s.id)}>
            {s.label} ({s.id === "all" ? orders.length : orders.filter((o) => o.status === s.id).length})
          </Button>
        ))}
      </div>

      <div className="mt-6 divide-y divide-border border border-border bg-card">
        {list.length === 0 && <p className="px-5 py-16 text-center text-sm text-muted-foreground">No orders here yet.</p>}
        {list.map((o) => (
          <div key={o.id}>
            <div className="flex flex-wrap items-center gap-3 px-5 py-4">
              <button className="flex flex-1 items-center gap-4 text-left" onClick={() => setOpenId(openId === o.id ? null : o.id)}>
                <span className="font-display text-xl font-bold">#{o.order_number}</span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{o.customer_name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })} · {o.items.reduce((n, l) => n + l.qty, 0)} items
                  </span>
                </span>
              </button>
              <span className="font-semibold">{formatRand(o.total)}</span>
              <Select value={o.status} onValueChange={(status) => setStatus.mutate({ id: o.id, status })}>
                <SelectTrigger className="w-44" aria-label={`Status of order ${o.order_number}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {openId === o.id && (
              <div className="grid gap-6 bg-muted/50 px-5 py-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="eyebrow text-muted-foreground">Customer</p>
                  <p className="mt-2">{o.phone}</p>
                  {o.email && <p>{o.email}</p>}
                  <p className="mt-1 whitespace-pre-line">{o.address}</p>
                  {o.notes && <p className="mt-2 italic text-muted-foreground">"{o.notes}"</p>}
                </div>
                <div>
                  <p className="eyebrow text-muted-foreground">Items</p>
                  <ul className="mt-2 space-y-1">
                    {o.items.map((l) => (
                      <li key={`${l.productId}-${l.size ?? ""}`} className="flex justify-between gap-4">
                        <span>{l.qty} × {l.name}{l.size ? ` — size ${l.size}` : ""}</span><span>{formatRand(l.price * l.qty)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 flex justify-between border-t border-border pt-2 font-semibold"><span>Total</span><span>{formatRand(o.total)}</span></p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
