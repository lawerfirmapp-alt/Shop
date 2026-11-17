import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, LogOut, Package, Settings, ShoppingCart, Store, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/tsholo-r-fashion-house-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.rpc("has_role", { _user_id: context.user.id, _role: "admin" });
    return { isAdmin: data === true };
  },
  head: () => ({
    meta: [
      { title: "Store admin | Tsholo R Fashion House" },
      { name: "description", content: "Manage Tsholo R Fashion House products, photos, orders and staff." },
      { property: "og:title", content: "Store admin | Tsholo R Fashion House" },
      { property: "og:description", content: "Owner dashboard for Tsholo R Fashion House." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/products", label: "Products & photos", icon: Package },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/staff", label: "Staff", icon: Users },
  { to: "/admin/settings", label: "Departments", icon: Settings },
] as const;

function AdminLayout() {
  const { isAdmin, user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-cream px-5 text-center">
        <div className="max-w-sm">
          <h1 className="text-3xl font-bold">No access</h1>
          <p className="mt-2 text-sm text-muted-foreground">{user.email} isn't the store owner account. Only the owner can open the admin area.</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" asChild><Link to="/">Back to shop</Link></Button>
            <Button variant="gold" onClick={signOut}>Sign out</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream md:flex">
      <aside className="border-b border-border bg-card md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <div className="px-5 py-4">
          <img src={logo.url} alt="Tsholo R Fashion House" width={632} height={276} className="h-12 w-auto" />
          <p className="mt-1 text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">Store admin</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {nav.map(({ to, label, icon: Icon, ...rest }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: "exact" in rest }}
              className="flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-gold/15 data-[status=active]:font-semibold data-[status=active]:text-foreground"
            >
              <Icon className="size-4" /> {label}
            </Link>
          ))}
        </nav>
        <div className="hidden space-y-1 border-t border-border px-3 py-3 md:absolute md:inset-x-0 md:bottom-0 md:block">
          <Link to="/" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent"><Store className="size-4" /> View shop</Link>
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent"><LogOut className="size-4" /> Sign out</button>
          <p className="truncate px-3 pt-1 text-xs text-muted-foreground">{user.email}</p>
        </div>
      </aside>
      <main className="flex-1 px-5 py-8 md:px-10">
        <Outlet />
        <div className="mt-10 flex gap-4 md:hidden">
          <Link to="/" className="text-sm text-muted-foreground underline">View shop</Link>
          <button onClick={signOut} className="text-sm text-muted-foreground underline">Sign out</button>
        </div>
      </main>
    </div>
  );
}
