import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { LOGO_SRC } from "@/lib/brand";

/** Simple centred page used by the confirm and unsubscribe links in our emails. */
export function NoticePage({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-cream px-5 py-10 text-center">
      <div className="w-full max-w-md border border-border bg-card p-8">
        <img src={LOGO_SRC} alt="Tsholo R Fashion House" width={632} height={276} className="mx-auto h-20 w-auto" />
        <h1 className="mt-6 text-3xl font-bold">{title}</h1>
        <div className="mt-3 space-y-4 text-sm text-muted-foreground">{children}</div>
        <Button variant="gold" className="mt-6" asChild>
          <Link to="/">Back to the shop</Link>
        </Button>
      </div>
    </div>
  );
}
