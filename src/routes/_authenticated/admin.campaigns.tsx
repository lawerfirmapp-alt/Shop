import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Eye, ImagePlus, Send, X } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { adminProductsQuery } from "@/lib/admin-data";
import { formatRand, type Product } from "@/lib/catalog";
import { buildCampaignHtml, CAMPAIGN_KINDS, formatDateZA, previewHtml, type CampaignKind } from "@/lib/marketing";
import { PHOTO_BUCKET } from "@/lib/product-images";

interface EmailSettings {
  sender_name: string;
  sender_email: string | null;
  site_url: string;
  shop_address: string;
}

interface Campaign {
  id: string;
  kind: string;
  subject: string;
  status: string;
  recipients: number;
  sent_count: number;
  failed_count: number;
  sent_at: string | null;
  created_at: string;
}

const settingsQuery = queryOptions({
  queryKey: ["admin", "email-settings"],
  queryFn: async () => {
    const r = await supabase.from("email_settings").select("sender_name, sender_email, site_url, shop_address").eq("id", 1).maybeSingle();
    if (r.error) throw new Error(r.error.message);
    return (r.data ?? null) as EmailSettings | null;
  },
});

const campaignsQuery = queryOptions({
  queryKey: ["admin", "campaigns"],
  queryFn: async () => {
    const r = await supabase
      .from("campaigns")
      .select("id, kind, subject, status, recipients, sent_count, failed_count, sent_at, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (r.error) throw new Error(r.error.message);
    return (r.data ?? []) as Campaign[];
  },
});

export const Route = createFileRoute("/_authenticated/admin/campaigns")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(settingsQuery),
      context.queryClient.ensureQueryData(campaignsQuery),
      context.queryClient.ensureQueryData(adminProductsQuery),
    ]),
  component: CampaignsAdmin,
});

const DEFAULT_ADDRESS = "56 Augrabies Street, 71 Stone Forest, Mooikloof Ridge Estate, 0081";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function CampaignsAdmin() {
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const { data: campaigns } = useSuspenseQuery(campaignsQuery);
  const { data: products } = useSuspenseQuery(adminProductsQuery);

  const status = useQuery({
    queryKey: ["admin", "email-status"],
    queryFn: async () => {
      const r = await supabase.rpc("email_status");
      if (r.error) throw new Error(r.error.message);
      return r.data as unknown as { connected: boolean; key_hint: string | null };
    },
  });
  const audience = useQuery({
    queryKey: ["admin", "audience"],
    queryFn: async () => {
      const r = await supabase
        .from("subscribers")
        .select("id", { count: "exact", head: true })
        .eq("status", "confirmed")
        .eq("consent_email", true)
        .not("email", "is", null);
      if (r.error) throw new Error(r.error.message);
      return r.count ?? 0;
    },
  });

  const ready = !!settings?.sender_email && status.data?.connected === true;

  return (
    <div>
      <p className="eyebrow text-gold">Marketing</p>
      <h1 className="mt-1 text-4xl font-bold">Campaigns</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Tell your subscribers about a new collection or a special offer. Emails go only to people who confirmed their subscription, and every email has an
        unsubscribe link and your shop's name and address.
      </p>

      <EmailSetup settings={settings} connected={status.data?.connected === true} hint={status.data?.key_hint ?? null} />
      <Composer settings={settings} products={products} audience={audience.data ?? 0} ready={ready} />
      <History campaigns={campaigns} />
    </div>
  );
}

function EmailSetup({ settings, connected, hint }: { settings: EmailSettings | null; connected: boolean; hint: string | null }) {
  const qc = useQueryClient();
  const [senderName, setSenderName] = useState(settings?.sender_name ?? "Tsholo R Fashion House");
  const [senderEmail, setSenderEmail] = useState(settings?.sender_email ?? "");
  const [siteUrl, setSiteUrl] = useState(settings?.site_url ?? (typeof window !== "undefined" ? window.location.origin : ""));
  const [address, setAddress] = useState(settings?.shop_address ?? DEFAULT_ADDRESS);
  const [apiKey, setApiKey] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      const url = siteUrl.trim();
      if (!/^https?:\/\//.test(url) || url.includes(" ")) throw new Error("Enter your shop's web address, starting with https://");
      if (!senderEmail.includes("@")) throw new Error("Enter the sender email address you verified in Brevo.");
      const { error } = await supabase.from("email_settings").upsert({
        id: 1,
        sender_name: senderName.trim() || "Tsholo R Fashion House",
        sender_email: senderEmail.trim(),
        site_url: url.replace(/\/+$/, ""),
        shop_address: address.trim() || DEFAULT_ADDRESS,
        updated_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Email details saved");
      qc.invalidateQueries({ queryKey: ["admin", "email-settings"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const saveKey = useMutation({
    mutationFn: async (key: string) => {
      const { error } = await supabase.rpc("set_email_api_key", { p_key: key });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, key) => {
      toast.success(key.trim() ? "Brevo key saved" : "Brevo key removed");
      setApiKey("");
      qc.invalidateQueries({ queryKey: ["admin", "email-status"] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <section className="mt-10 max-w-3xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-2xl font-semibold">Email setup</h2>
        <span className={connected && settings?.sender_email ? "text-sm font-semibold text-gold" : "text-sm font-semibold text-destructive"}>
          {connected && settings?.sender_email ? "Ready to send" : "Not finished yet"}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Emails are sent through Brevo. Create an API key in your Brevo account and add your sender address there first, then save both here. The key is
        stored privately and can never be read back.
      </p>

      <form
        className="mt-4 grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="c-sender-name">Sender name</Label>
          <Input id="c-sender-name" value={senderName} onChange={(e) => setSenderName(e.target.value)} maxLength={80} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-sender-email">Sender email (verified in Brevo)</Label>
          <Input id="c-sender-email" type="email" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} maxLength={255} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="c-site">Your shop's web address</Label>
          <Input id="c-site" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="https://yourshop.co.za" maxLength={200} />
          <p className="text-xs text-muted-foreground">Links in emails (confirm, unsubscribe, visit the shop) open this address. Use the address your customers really use.</p>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="c-address">Shop address (shown at the bottom of every email)</Label>
          <Input id="c-address" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={250} />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" variant="gold" disabled={save.isPending}>{save.isPending ? "Saving..." : "Save email details"}</Button>
        </div>
      </form>

      <form
        className="mt-6 flex flex-wrap items-end gap-3 border-t border-border pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (apiKey.trim()) saveKey.mutate(apiKey);
        }}
      >
        <div className="min-w-60 flex-1 space-y-1.5">
          <Label htmlFor="c-key">Brevo API key {connected && hint ? `(saved, ends in ${hint})` : "(not saved yet)"}</Label>
          <Input id="c-key" type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste the key here" />
        </div>
        <Button type="submit" variant="gold" disabled={saveKey.isPending || !apiKey.trim()}>Save key</Button>
        {connected && (
          <Button type="button" variant="outline" disabled={saveKey.isPending} onClick={() => confirm("Remove the saved Brevo key? Nothing can be sent until you add one again.") && saveKey.mutate("")}>
            Remove key
          </Button>
        )}
      </form>
    </section>
  );
}

function Composer({ settings, products, audience, ready }: { settings: EmailSettings | null; products: Product[]; audience: number; ready: boolean }) {
  const qc = useQueryClient();
  const [id, setId] = useState<string | null>(null);
  const [kind, setKind] = useState<CampaignKind>("new_collection");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [endsOn, setEndsOn] = useState("");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const active = useMemo(() => products.filter((p) => p.is_active), [products]);

  const html = useMemo(() => {
    if (!settings) return null;
    const site = settings.site_url.replace(/\/+$/, "");
    return buildCampaignHtml({
      kind,
      subject: subject.trim() || "Your subject here",
      message: message.trim() || "Your message will appear here.",
      imageUrl,
      products: active.filter((p) => picked.includes(p.id)).map((p) => ({ name: p.name, price: formatRand(p.price), url: `${site}/#collection` })),
      endsOn: kind === "special" && endsOn ? endsOn : null,
      siteUrl: settings.site_url,
      senderName: settings.sender_name,
      shopAddress: settings.shop_address,
    });
  }, [settings, kind, subject, message, imageUrl, active, picked, endsOn]);

  const check = () => {
    if (!settings || !html) throw new Error("Finish and save your email setup first.");
    if (!ready) throw new Error("Add your Brevo key and sender email first.");
    if (subject.trim().length < 2) throw new Error("Please write a subject.");
    if (message.trim().length < 5) throw new Error("Please write your message.");
    if (message.length > 5000) throw new Error("The message is too long (5000 characters at most).");
  };

  const saveDraft = async () => {
    const row = {
      kind,
      channel: "email",
      subject: subject.trim(),
      message: message.trim(),
      image_path: imagePath,
      product_ids: picked,
      ends_on: kind === "special" && endsOn ? endsOn : null,
    };
    if (id) {
      const { error } = await supabase.from("campaigns").update(row).eq("id", id);
      if (error) throw new Error(error.message);
      return id;
    }
    const { data, error } = await supabase.from("campaigns").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    setId(data.id);
    return data.id;
  };

  const reset = () => {
    setId(null);
    setKind("new_collection");
    setSubject("");
    setMessage("");
    setPicked([]);
    setEndsOn("");
    setImagePath(null);
    setImageUrl(null);
    setShowPreview(false);
  };

  const sendTest = useMutation({
    mutationFn: async () => {
      check();
      const cid = await saveDraft();
      const { data, error } = await supabase.rpc("send_campaign", { p_id: cid, p_html: html ?? "", p_test: true });
      if (error) throw new Error(error.message);
      const res = data as unknown as { to?: string; request_id?: number | null };
      if (res.request_id == null) throw new Error("The email service is not connected.");
      for (let i = 0; i < 6; i++) {
        await wait(2000);
        const r = await supabase.rpc("email_request_result", { p_request_id: res.request_id });
        if (r.error) throw new Error(r.error.message);
        const out = r.data as unknown as { done: boolean; ok?: boolean; error?: string | null };
        if (out.done) {
          if (out.ok) return { to: res.to ?? "you", pending: false };
          throw new Error(out.error || "The email service refused the test email.");
        }
      }
      return { to: res.to ?? "you", pending: true };
    },
    onSuccess: (r) => toast.success(r.pending ? `Test email to ${r.to} is on its way. It can take a minute.` : `Test email sent to ${r.to}. Check your inbox and spam folder.`),
    onError: (e) => toast.error(e.message),
  });

  const sendAll = useMutation({
    mutationFn: async () => {
      check();
      if (audience === 0) throw new Error("You have no confirmed email subscribers yet.");
      const cid = await saveDraft();
      const { data, error } = await supabase.rpc("send_campaign", { p_id: cid, p_html: html ?? "", p_test: false });
      if (error) throw new Error(error.message);
      return data as unknown as { recipients: number; batches: number };
    },
    onSuccess: (r) => {
      toast.success(`Sending to ${r.recipients} ${r.recipients === 1 ? "subscriber" : "subscribers"}. Watch the history below.`);
      reset();
      qc.invalidateQueries({ queryKey: ["admin", "campaigns"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const pickImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("The image is larger than 5 MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `campaign-${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      // Emails are read for weeks, so the image link is made to last a year.
      const signed = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signed.error) throw signed.error;
      setImagePath(path);
      setImageUrl(signed.data.signedUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The image could not be uploaded");
    } finally {
      setUploading(false);
    }
  };

  const toggleProduct = (pid: string, on: boolean) =>
    setPicked((cur) => {
      if (!on) return cur.filter((x) => x !== pid);
      if (cur.length >= 6) {
        toast.error("You can feature up to 6 pieces");
        return cur;
      }
      return [...cur, pid];
    });

  const busy = sendTest.isPending || sendAll.isPending;

  return (
    <section className="mt-10 max-w-3xl">
      <h2 className="font-display text-3xl font-semibold">Write a new campaign</h2>
      {!ready && (
        <p className="mt-2 border border-destructive/40 bg-card p-3 text-sm">
          Sending is switched off until the email setup above is finished (sender email saved and Brevo key added).
        </p>
      )}

      <div className="mt-4 grid gap-5 border border-border bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="k-kind">What is it about?</Label>
            <select id="k-kind" value={kind} onChange={(e) => setKind(e.target.value as CampaignKind)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              {CAMPAIGN_KINDS.map((k) => (
                <option key={k.id} value={k.id}>{k.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Send by</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="gold" size="sm">Email</Button>
              <Button type="button" variant="outline" size="sm" disabled title="WhatsApp sending is coming soon">WhatsApp - coming soon</Button>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="k-subject">Subject</Label>
          <Input id="k-subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} placeholder="For example: Our new Ankara collection is here" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="k-message">Message</Label>
          <Textarea id="k-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={8} maxLength={5000} placeholder="Each person's name is added at the top automatically. Leave a blank line between paragraphs." />
        </div>

        {kind === "special" && (
          <div className="space-y-1.5 sm:max-w-xs">
            <Label htmlFor="k-ends">Offer ends on (optional)</Label>
            <Input id="k-ends" type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">Picture (optional)</p>
          {imageUrl ? (
            <div className="flex items-center gap-3">
              <img src={imageUrl} alt="Campaign" className="h-24 w-24 object-cover" />
              <Button type="button" variant="outline" size="sm" onClick={() => { setImagePath(null); setImageUrl(null); }}>
                <X /> Remove picture
              </Button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center gap-3 border border-dashed border-border p-4 text-sm hover:border-gold">
              <ImagePlus className="size-5 text-muted-foreground" />
              <span>{uploading ? "Uploading..." : "Choose a picture"} <span className="text-muted-foreground">(up to 5 MB)</span></span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                aria-label="Campaign picture"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void pickImage(f);
                }}
              />
            </label>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Feature pieces from the shop (optional, up to 6)</p>
          <div className="grid max-h-56 gap-2 overflow-y-auto border border-border p-3 sm:grid-cols-2">
            {active.length === 0 && <p className="text-sm text-muted-foreground">No products yet.</p>}
            {active.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <Checkbox checked={picked.includes(p.id)} onCheckedChange={(v) => toggleProduct(p.id, v === true)} aria-label={p.name} />
                <span className="flex-1 truncate">{p.name}</span>
                <span className="text-muted-foreground">{formatRand(p.price)}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={() => setShowPreview((v) => !v)}>
            <Eye /> {showPreview ? "Hide preview" : "Preview"}
          </Button>
          <Button type="button" variant="outline" disabled={busy || !ready} onClick={() => sendTest.mutate()}>
            {sendTest.isPending ? "Sending test..." : "Send test to me"}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="gold" disabled={busy || !ready || audience === 0}>
                <Send /> Send to everyone ({audience})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Send this campaign now?</AlertDialogTitle>
                <AlertDialogDescription>
                  It will be emailed to {audience} confirmed {audience === 1 ? "subscriber" : "subscribers"}. This cannot be undone or sent twice, so please check the preview and send yourself a test first.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Not yet</AlertDialogCancel>
                <AlertDialogAction onClick={() => sendAll.mutate()}>Yes, send it</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        {audience === 0 && <p className="text-xs text-muted-foreground">Nobody has confirmed their email subscription yet, so there is no one to send to.</p>}

        {showPreview && html && (
          <iframe title="Email preview" sandbox="" srcDoc={previewHtml(html)} className="h-[560px] w-full border border-border bg-white" />
        )}
      </div>
    </section>
  );
}

const STATUS_TEXT: Record<string, string> = { draft: "Draft", sending: "Sending", sent: "Sent", failed: "Failed" };

function History({ campaigns }: { campaigns: Campaign[] }) {
  const qc = useQueryClient();
  const sendingKey = campaigns.filter((c) => c.status === "sending").map((c) => c.id).join(",");

  // While a campaign is being sent, ask the email service how it is going.
  useEffect(() => {
    if (!sendingKey) return;
    const ids = sendingKey.split(",");
    const run = async () => {
      await Promise.all(ids.map((cid) => supabase.rpc("refresh_campaign", { p_id: cid })));
      qc.invalidateQueries({ queryKey: ["admin", "campaigns"] });
    };
    void run();
    const t = setInterval(() => void run(), 6000);
    return () => clearInterval(t);
  }, [sendingKey, qc]);

  const remove = useMutation({
    mutationFn: async (cid: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", cid).eq("status", "draft");
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "campaigns"] }),
    onError: (e) => toast.error(e.message),
  });

  return (
    <section className="mt-12 max-w-4xl">
      <h2 className="font-display text-3xl font-semibold">History</h2>
      <div className="mt-4 overflow-x-auto border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Delivered</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-12"><span className="sr-only">Delete draft</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No campaigns yet.</TableCell>
              </TableRow>
            )}
            {campaigns.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.subject}</TableCell>
                <TableCell className="text-sm">{CAMPAIGN_KINDS.find((k) => k.id === c.kind)?.label ?? c.kind}</TableCell>
                <TableCell className="text-sm">{STATUS_TEXT[c.status] ?? c.status}</TableCell>
                <TableCell className="text-sm">
                  {c.status === "draft" ? "-" : `${c.sent_count} of ${c.recipients}${c.failed_count > 0 ? ` (${c.failed_count} failed)` : ""}`}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDateZA(c.sent_at ?? c.created_at)}</TableCell>
                <TableCell>
                  {c.status === "draft" && (
                    <Button variant="ghost" size="icon" aria-label="Delete draft" disabled={remove.isPending} onClick={() => remove.mutate(c.id)}>
                      <X />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
