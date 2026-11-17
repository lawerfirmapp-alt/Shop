import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import logo from "@/assets/tsholo-r-fashion-house-logo.png.asset.json";

const safePath = (p?: string) => (p && p.startsWith("/") && !p.startsWith("//") ? p : "/admin");

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string | undefined } => ({
    redirect: typeof s["redirect"] === "string" ? s["redirect"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Owner sign in | Tsholo R Fashion House" },
      { name: "description", content: "Sign in to manage Tsholo R Fashion House products, orders and staff." },
      { property: "og:title", content: "Owner sign in | Tsholo R Fashion House" },
      { property: "og:description", content: "Store owner sign in for Tsholo R Fashion House." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const target = safePath(redirect);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: target, replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") navigate({ to: target, replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, target]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + target },
        });
        if (error) throw error;
        if (!data.session) setSent(true);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (result.error) toast.error("Google sign-in failed");
  };

  return (
    <div className="grid min-h-screen place-items-center bg-cream px-5">
      <div className="w-full max-w-sm border border-border bg-card p-8 shadow-card">
        <Link to="/" className="mb-6 block" aria-label="Back to shop"><img src={logo.url} alt="Tsholo R Fashion House" width={632} height={276} className="mx-auto h-20 w-auto" /></Link>
        <h1 className="text-center text-3xl font-bold">{mode === "signin" ? "Owner sign in" : "Create owner account"}</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">Manage products, photos, orders and staff.</p>

        {sent ? (
          <p className="mt-6 bg-accent p-4 text-sm">Check your email and click the link to confirm your account, then come back to sign in.</p>
        ) : (
          <>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" variant="gold" size="xl" className="w-full" disabled={busy}>
                {mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>
            <div className="my-4 text-center text-xs uppercase tracking-widest text-muted-foreground">or</div>
            <Button type="button" variant="outline" size="xl" className="w-full" onClick={google}>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[18px]"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
              Continue with Google
            </Button>
            <button type="button" className="mt-5 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
              {mode === "signin" ? "First time? Create the owner account" : "Already have an account? Sign in"}
            </button>
            <p className="mt-4 text-center text-xs text-muted-foreground">The first account created becomes the store owner.</p>
          </>
        )}
      </div>
    </div>
  );
}
