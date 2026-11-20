import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { NoticePage } from "@/components/shop/notice-page";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/subscribe/confirm")({
  validateSearch: (search: Record<string, unknown>) => ({ token: typeof search["token"] === "string" ? search["token"] : "" }),
  head: () => ({
    meta: [
      { title: "Confirm your subscription | Tsholo R Fashion House" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConfirmSubscription,
});

type State = "ready" | "busy" | "confirmed" | "unsubscribed" | "unknown" | "error";

function ConfirmSubscription() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<State>(token ? "ready" : "unknown");

  const confirm = async () => {
    setState("busy");
    const { data, error } = await supabase.rpc("confirm_subscription", { p_token: token });
    if (error) {
      setState("error");
      return;
    }
    const status = (data as { status?: string } | null)?.status;
    setState(status === "confirmed" ? "confirmed" : status === "unsubscribed" ? "unsubscribed" : status === "unknown" ? "unknown" : "error");
  };

  if (state === "confirmed") {
    return (
      <NoticePage title="You're subscribed">
        <p>Thank you! We'll email you when there is a new collection or a special offer. You can unsubscribe at any time using the link at the bottom of our emails.</p>
      </NoticePage>
    );
  }
  if (state === "unsubscribed") {
    return (
      <NoticePage title="You've unsubscribed">
        <p>This address was unsubscribed earlier. If you'd like to hear from us again, please sign up again using the form at the bottom of the shop.</p>
      </NoticePage>
    );
  }
  if (state === "unknown") {
    return (
      <NoticePage title="This link isn't valid">
        <p>The confirmation link is missing or has changed. Please sign up again using the form at the bottom of the shop and we'll send you a new link.</p>
      </NoticePage>
    );
  }
  if (state === "error") {
    return (
      <NoticePage title="Something went wrong">
        <p>We couldn't confirm your subscription just now. Please try the link in your email again in a moment.</p>
        <Button variant="outline" onClick={() => setState("ready")}>Try again</Button>
      </NoticePage>
    );
  }
  return (
    <NoticePage title="Confirm your subscription">
      <p>Press the button to confirm that you'd like to receive news about new collections and specials from Tsholo R Fashion House by email.</p>
      <Button variant="gold" size="lg" disabled={state === "busy"} onClick={() => void confirm()}>
        {state === "busy" ? "Confirming..." : "Yes, subscribe me"}
      </Button>
    </NoticePage>
  );
}
