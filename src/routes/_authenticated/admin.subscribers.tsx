import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, MailCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatDateZA, SUBSCRIBER_STATUSES, subscribersCsv, type SubscriberRow } from "@/lib/marketing";

type Subscriber = SubscriberRow & { id: string };

const subscribersQuery = queryOptions({
  queryKey: ["admin", "subscribers"],
  queryFn: async () => {
    const r = await supabase.from("subscribers").select("*").order("created_at", { ascending: false });
    if (r.error) throw new Error(r.error.message);
    return (r.data ?? []) as unknown as Subscriber[];
  },
});

export const Route = createFileRoute("/_authenticated/admin/subscribers")({
  loader: ({ context }) => context.queryClient.ensureQueryData(subscribersQuery),
  component: SubscribersAdmin,
});

const statusLabel = (id: string) => SUBSCRIBER_STATUSES.find((s) => s.id === id)?.label ?? id;

function SubscribersAdmin() {
  const qc = useQueryClient();
  const { data: rows } = useSuspenseQuery(subscribersQuery);
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (!q || r.name.toLowerCase().includes(q) || (r.email ?? "").toLowerCase().includes(q) || (r.whatsapp ?? "").includes(q)),
    );
  }, [rows, status, query]);

  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const awaiting = rows.filter((r) => r.status === "pending" && r.consent_email && r.email).length;

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subscribers").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Subscriber removed");
      qc.invalidateQueries({ queryKey: ["admin", "subscribers"] });
      qc.invalidateQueries({ queryKey: ["admin", "audience"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const resend = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("resend_confirmations");
      if (error) throw new Error(error.message);
      return Number(data ?? 0);
    },
    onSuccess: (n) => {
      toast.success(n > 0 ? `Confirmation email sent to ${n} ${n === 1 ? "person" : "people"}` : "Nobody needed a new confirmation email just now");
      qc.invalidateQueries({ queryKey: ["admin", "subscribers"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const download = () => {
    const blob = new Blob(["\ufeff", subscribersCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <p className="eyebrow text-gold">Your customers</p>
      <h1 className="mt-1 text-4xl font-bold">Subscribers</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        People who asked to hear about new collections and specials. Only <strong>confirmed</strong> email subscribers receive campaigns. WhatsApp numbers are
        kept safely for when WhatsApp sending is switched on.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {[{ id: "all", label: "All", n: rows.length }, ...SUBSCRIBER_STATUSES.map((s) => ({ id: s.id, label: s.label, n: count(s.id) }))].map((s) => (
          <Button key={s.id} variant="chip" size="sm" className="h-9 rounded-full px-5" data-active={status === s.id} onClick={() => setStatus(s.id)}>
            {s.label} ({s.n})
          </Button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email or number" aria-label="Search subscribers" className="max-w-xs" />
        <Button variant="outline" onClick={download} disabled={filtered.length === 0}>
          <Download /> Export CSV ({filtered.length})
        </Button>
        <Button variant="outline" onClick={() => resend.mutate()} disabled={resend.isPending || awaiting === 0}>
          <MailCheck /> Resend confirmation emails ({awaiting})
        </Button>
      </div>

      <div className="mt-6 overflow-x-auto border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Agreed to</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Signed up</TableHead>
              <TableHead className="w-12"><span className="sr-only">Remove</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No subscribers here yet.</TableCell>
              </TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-sm">
                  {r.email && <div>{r.email}</div>}
                  {r.whatsapp && <div className="text-muted-foreground">WhatsApp {r.whatsapp}</div>}
                </TableCell>
                <TableCell className="text-sm">{[r.consent_email && "Email", r.consent_whatsapp && "WhatsApp"].filter(Boolean).join(" + ") || "Nothing"}</TableCell>
                <TableCell className="text-sm">{statusLabel(r.status)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateZA(r.consent_at)}
                  <div className="text-xs capitalize">via {r.source}</div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${r.name}`}
                    disabled={remove.isPending}
                    onClick={() => confirm(`Remove ${r.name} from your list for good?`) && remove.mutate(r.id)}
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
