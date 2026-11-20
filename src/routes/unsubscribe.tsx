import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { NoticePage } from "@/components/shop/notice-page";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (search: Record<string, unknown>) => ({ token: typeof search["token"] === "string" ? search["token"] : "" }),
  head: () => ({
    meta: [
      { title: "Unsubscribe | Tsholo R Fashion House" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Unsubscribe,
});

type State = "ready" | "busy" | "done" | "unknown" | "error";

function Unsubscribe() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<State>("ready");

  const unsubscribe = async () => {
    setState("busy");
    const { data, error } = await supabase.rpc("unsubscribe", { p_token: token });
    if (error) {
      setState("error");
      return;
    }
    setState((data as { status?: string } | null)?.status === "unsubscribed" ? "done" : "unknown");
  };

  if (!token) {
    return (
      <NoticePage title="Nothing to unsubscribe">
        <p>This looks like a preview or test email, so there is no subscription attached to this link. In a real email, this link unsubscribes the person who received it.</p>
      </NoticePage>
    );
  }
  if (state === "done") {
    return (
      <NoticePage title="You've been unsubscribed">
        <p>We've removed you from our email and WhatsApp updates. You won't hear from us again unless you sign up again. Thank you for having been with us.</p>
      </NoticePage>
    );
  }
  if (state === "unknown") {
    return (
      <NoticePage title="This link isn't valid">
        <p>We couldn't find a subscription for this link. If you still receive emails from us, please reply to one of them and we'll remove you by hand.</p>
      </NoticePage>
    );
  }
  if (state === "error") {
    return (
      <NoticePage title="Something went wrong">
        <p>We couldn't unsubscribe you just now. Please try again in a moment.</p>
        <Button variant="outline" onClick={() => setState("ready")}>Try again</Button>
      </NoticePage>
    );
  }
  return (
    <NoticePage title="Unsubscribe">
      <p>Press the button to stop receiving news about new collections and specials from Tsholo R Fashion House.</p>
      <Button variant="gold" size="lg" disabled={state === "busy"} onClick={() => void unsubscribe()}>
        {state === "busy" ? "Unsubscribing..." : "Yes, unsubscribe me"}
      </Button>
    </NoticePage>
  );
}
