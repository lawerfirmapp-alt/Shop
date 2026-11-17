import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { formatRand, statusLabel } from "@/lib/catalog";
import { adminOrdersQuery, adminProductsQuery, adminStaffQuery } from "@/lib/admin-data";

export const Route = createFileRoute("/_authenticated/admin/")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(adminProductsQuery),
      context.queryClient.ensureQueryData(adminOrdersQuery),
      context.queryClient.ensureQueryData(adminStaffQuery),
    ]),
  component: Overview,
});

function Overview() {
  const { data: products } = useSuspenseQuery(adminProductsQuery);
  const { data: orders } = useSuspenseQuery(adminOrdersQuery);
  const { data: staff } = useSuspenseQuery(adminStaffQuery);

  const awaiting = orders.filter((o) => o.status === "awaiting_payment");
  const stats = [
    { label: "Products in shop", value: products.filter((p) => p.is_active).length, to: "/admin/products" },
    { label: "New arrivals", value: products.filter((p) => p.is_new_arrival && p.is_active).length, to: "/admin/products" },
    { label: "Orders awaiting payment", value: awaiting.length, to: "/admin/orders" },
    { label: "Active staff", value: staff.filter((s) => s.active).length, to: "/admin/staff" },
  ] as const;

  return (
    <div>
      <p className="eyebrow text-gold">Welcome back</p>
      <h1 className="mt-1 text-4xl font-bold">Store overview</h1>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="border border-border bg-card p-5 transition-shadow hover:shadow-card">
            <p className="font-display text-4xl font-bold">{s.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
          </Link>
        ))}
      </div>

      <section className="mt-10 border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-2xl font-semibold">Latest orders</h2>
          <Link to="/admin/orders" className="text-sm text-gold underline-offset-4 hover:underline">See all</Link>
        </div>
        {orders.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">No orders yet. They'll appear here when shoppers check out.</p>
        ) : (
          <ul className="divide-y divide-border">
            {orders.slice(0, 5).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                <span className="font-semibold">#{o.order_number}</span>
                <span className="flex-1 truncate">{o.customer_name}</span>
                <span className="hidden text-muted-foreground sm:block">{statusLabel(o.status)}</span>
                <span className="font-semibold">{formatRand(o.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
