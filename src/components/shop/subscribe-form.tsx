import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export type SubscribeResult = { status: "check_email" | "saved" | "already"; sent?: boolean };

/** Signs someone up only for the channels they ticked. Email needs confirming from the email we send. */
export async function subscribe(input: { name: string; email: string; whatsapp: string; consentEmail: boolean; consentWhatsapp: boolean; source: "footer" | "checkout" }) {
  const { data, error } = await supabase.rpc("subscribe", {
    p_name: input.name, p_email: input.email, p_whatsapp: input.whatsapp,
    p_consent_email: input.consentEmail, p_consent_whatsapp: input.consentWhatsapp, p_source: input.source,
  });
  if (error) throw new Error(error.message);
  return data as unknown as SubscribeResult;
}

export const subscribeMessage = (r: SubscribeResult) =>
  r.status === "already" ? "You're already subscribed. Thank you!"
  : r.status === "check_email" ? (r.sent ? "Almost done! Check your email and press the link to confirm." : "Thank you! We'll email you a link to confirm your subscription.")
  : "Thank you! We'll message you on WhatsApp when our WhatsApp updates start.";

export function SubscribeForm() {
  const [email, setEmail] = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const r = await subscribe({
        name: String(f.get("name") ?? ""), email: String(f.get("email") ?? ""), whatsapp: String(f.get("whatsapp") ?? ""),
        consentEmail: email, consentWhatsapp: whatsapp, source: "footer",
      });
      setDone(subscribeMessage(r));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto mt-8 max-w-2xl border border-border bg-card p-6 text-left">
      <h2 className="text-center font-display text-2xl font-semibold">New collections & specials</h2>
      <p className="mt-1 text-center text-sm text-muted-foreground">Be the first to hear about new pieces and offers.</p>
      {done ? (
        <p className="mt-4 bg-accent p-4 text-center text-sm">{done}</p>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5"><Label htmlFor="s-name">Name</Label><Input id="s-name" name="name" required minLength={2} maxLength={80} /></div>
            <div className="space-y-1.5"><Label htmlFor="s-email">Email</Label><Input id="s-email" name="email" type="email" maxLength={255} required={email} /></div>
            <div className="space-y-1.5"><Label htmlFor="s-whatsapp">WhatsApp (optional)</Label><Input id="s-whatsapp" name="whatsapp" type="tel" maxLength={20} required={whatsapp} /></div>
          </div>
          <fieldset className="space-y-2 text-sm">
            <legend className="mb-1 font-medium">How may we contact you?</legend>
            <label className="flex items-center gap-2"><Checkbox checked={email} onCheckedChange={(v) => setEmail(v === true)} aria-label="By email" /> By email</label>
            <label className="flex items-center gap-2"><Checkbox checked={whatsapp} onCheckedChange={(v) => setWhatsapp(v === true)} aria-label="By WhatsApp" /> By WhatsApp</label>
          </fieldset>
          <Button type="submit" variant="gold" size="lg" className="w-full" disabled={busy || (!email && !whatsapp)}>{busy ? "Signing up…" : "Sign me up"}</Button>
          <p className="text-xs text-muted-foreground">
            We only contact you on the channels you tick, and you can unsubscribe at any time, free of charge. Your details stay with Tsholo R Fashion House and are never shared.
          </p>
        </form>
      )}
    </div>
  );
}
