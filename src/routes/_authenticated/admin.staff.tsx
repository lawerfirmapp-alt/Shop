import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { adminStaffQuery, type StaffMember } from "@/lib/admin-data";

export const Route = createFileRoute("/_authenticated/admin/staff")({
  loader: ({ context }) => context.queryClient.ensureQueryData(adminStaffQuery),
  component: StaffAdmin,
});

type Draft = Omit<StaffMember, "id"> & { id?: string };
const empty: Draft = { full_name: "", role_title: "", phone: "", email: "", notes: "", active: true };

function StaffAdmin() {
  const qc = useQueryClient();
  const { data: staff } = useSuspenseQuery(adminStaffQuery);
  const [draft, setDraft] = useState<Draft | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "staff"] });

  const save = useMutation({
    mutationFn: async ({ id, ...d }: Draft) => {
      if (!d.full_name.trim()) throw new Error("Please add a name");
      const row = { ...d, full_name: d.full_name.trim(), email: d.email?.trim() || null, phone: d.phone?.trim() || null, notes: d.notes?.trim() || null };
      const res = id ? await supabase.from("staff").update(row).eq("id", id) : await supabase.from("staff").insert(row);
      if (res.error) throw res.error;
    },
    onSuccess: () => { toast.success("Staff member saved"); setDraft(null); refresh(); },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("staff").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Staff member removed"); refresh(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-gold">Team</p>
          <h1 className="mt-1 text-4xl font-bold">Staff</h1>
          <p className="mt-2 text-sm text-muted-foreground">Keep your team's contact details and roles in one place.</p>
        </div>
        <Button variant="gold" size="xl" onClick={() => setDraft({ ...empty })}><Plus /> Add staff member</Button>
      </div>

      <div className="mt-6 divide-y divide-border border border-border bg-card">
        {staff.length === 0 && <p className="px-5 py-16 text-center text-sm text-muted-foreground">No staff added yet.</p>}
        {staff.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
            <span className="grid size-10 place-items-center rounded-full bg-gold/15 font-display font-bold">
              {s.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{s.full_name} {!s.active && <span className="ml-2 text-xs font-normal text-muted-foreground">(inactive)</span>}</p>
              <p className="text-sm text-muted-foreground">{[s.role_title, s.phone, s.email].filter(Boolean).join(" · ")}</p>
            </div>
            <Button variant="ghost" size="icon" aria-label={`Edit ${s.full_name}`} onClick={() => setDraft({ ...s })}><Pencil /></Button>
            <Button variant="ghost" size="icon" className="text-destructive" aria-label={`Remove ${s.full_name}`} onClick={() => confirm(`Remove ${s.full_name}?`) && remove.mutate(s.id)}><Trash2 /></Button>
          </div>
        ))}
      </div>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display text-2xl">{draft?.id ? "Edit staff member" : "Add staff member"}</DialogTitle></DialogHeader>
          {draft && (
            <form id="staff-form" className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(draft); }}>
              <Field label="Full name"><Input value={draft.full_name} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} required /></Field>
              <Field label="Role (e.g. Seamstress, Sales)"><Input value={draft.role_title} onChange={(e) => setDraft({ ...draft, role_title: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone"><Input value={draft.phone ?? ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></Field>
                <Field label="Email"><Input type="email" value={draft.email ?? ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></Field>
              </div>
              <Field label="Notes"><Textarea value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>
              <label className="flex items-center gap-2 text-sm"><Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} /> Active</label>
            </form>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
            <Button variant="gold" type="submit" form="staff-form" disabled={save.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
