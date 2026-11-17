import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { adminDepartmentsQuery, adminProductsQuery } from "@/lib/admin-data";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(adminDepartmentsQuery),
      context.queryClient.ensureQueryData(adminProductsQuery),
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
      <p className="eyebrow text-gold">Shop setup</p>
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
