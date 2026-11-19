import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { Search, ShoppingBag, Minus, Plus, Sparkles, ShieldCheck, Truck, CheckCircle2, MapPin, Phone, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import heroImg from "@/assets/hero-ankara.jpg";
import { LOGO_SRC } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatRand, needsSize, visibleProducts, type Filter, type Product } from "@/lib/catalog";
import { ProductDialog } from "@/components/shop/product-dialog";
import { ShopVideo } from "@/components/shop/shop-video";
import { useProductImages } from "@/lib/product-images";
import { getStorefront, placeOrder } from "@/lib/shop.functions";
import { SHOP_CONTACT, telLink, whatsappLink } from "@/lib/contact";

const storefrontQuery = queryOptions({ queryKey: ["storefront"], queryFn: () => getStorefront() });

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(storefrontQuery),
  head: () => ({
    meta: [
      { title: "Tsholo R Fashion House | African Fashion for Women, Men & Family" },
      { name: "description", content: "Shop South African Shweshwe and Ankara for women, men, kids and matching family sets, plus Kente, Mudcloth and handmade African accessories." },
      { property: "og:title", content: "Tsholo R Fashion House | African Fashion for the Whole Family" },
      { property: "og:description", content: "South African Ankara & Shweshwe for women, men and matching family sets — wear your story." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Shop,
});

type CartLine = Product & { qty: number; size?: string | undefined; key: string };

function Shop() {
  const { data } = useSuspenseQuery(storefrontQuery);
  const { products, departments } = data;
  const images = useProductImages(products);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [bagOpen, setBagOpen] = useState(false);
  const [step, setStep] = useState<"bag" | "details" | "done">("bag");
  const [placed, setPlaced] = useState<{ orderNumber: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<Product | null>(null);

  const list = useMemo(() => visibleProducts(products, departments, filter, query), [products, departments, filter, query]);
  const newArrivals = useMemo(() => visibleProducts(products, departments, "new").slice(0, 4), [products, departments]);
  const openDepts = departments.filter((d) => d.enabled);
  const count = cart.reduce((n, l) => n + l.qty, 0);
  const total = cart.reduce((n, l) => n + l.qty * l.price, 0);

  const add = (p: Product, size?: string, qty = 1) => {
    const key = `${p.id}:${size ?? ""}`;
    setCart((c) => {
      const hit = c.find((l) => l.key === key);
      return hit ? c.map((l) => (l.key === key ? { ...l, qty: Math.min(20, l.qty + qty) } : l)) : [...c, { ...p, qty, size, key }];
    });
    toast.success(`${p.name}${size ? ` (${size})` : ""} added to your bag`);
  };
  const change = (key: string, delta: number) =>
    setCart((c) => c.map((l) => (l.key === key ? { ...l, qty: Math.min(20, l.qty + delta) } : l)).filter((l) => l.qty > 0));

  const pick = (f: Filter) => {
    setFilter(f);
    document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" });
  };

  const openBag = () => {
    if (step === "done") setStep("bag");
    setBagOpen(true);
  };

  const submitOrder = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const res = await placeOrder({
        data: {
          customer_name: String(f.get("name") ?? ""),
          phone: String(f.get("phone") ?? ""),
          email: String(f.get("email") ?? ""),
          address: String(f.get("address") ?? ""),
          notes: String(f.get("notes") ?? ""),
          lines: cart.map((l) => ({ productId: l.id, qty: l.qty, size: l.size })),
        },
      });
      setPlaced(res);
      setCart([]);
      setStep("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(msg.startsWith("[") ? "Please check your details and try again." : msg || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const card = (p: Product) => (
    <article key={p.id} className="group flex flex-col overflow-hidden border border-border bg-card transition-shadow hover:shadow-card">
      <button type="button" onClick={() => setViewing(p)} aria-label={`View ${p.name}`} className="relative block aspect-[4/5] overflow-hidden bg-muted">
        {images[p.id] && (
          <img src={images[p.id]} alt={p.name} width={800} height={1008} loading="lazy" className="size-full object-cover transition-transform duration-700 group-hover:scale-105" />
        )}
        {(p.tag || p.is_new_arrival) && (
          <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider">
            {p.tag || "New"}
          </span>
        )}
      </button>
      <div className="flex flex-1 flex-col p-3 md:p-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-gold">{p.fabric} · {p.origin}</p>
        <h3 className="mt-1 flex-1 text-lg font-semibold leading-snug md:text-xl">
          <button type="button" onClick={() => setViewing(p)} className="text-left hover:text-gold">{p.name}</button>
        </h3>
        <p className="mt-2 font-semibold">{formatRand(p.price)}</p>
        {needsSize(p) ? (
          <Button variant="gold" className="mt-3 w-full" onClick={() => setViewing(p)}>Choose size</Button>
        ) : (
          <Button variant="gold" className="mt-3 w-full" onClick={() => add(p)}>Add to bag</Button>
        )}
      </div>
    </article>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gold-soft py-2.5 text-center text-foreground eyebrow">
        African fashion · Order now, pay on confirmation · South Africa
      </div>

      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-5 py-4 md:flex-nowrap md:px-10">
          <a href="/" className="flex items-center" aria-label="Tsholo R Fashion House home">
            <img src={LOGO_SRC} alt="Tsholo R Fashion House" width={632} height={276} className="h-14 w-auto md:h-20" />
          </a>
          <label className="order-3 flex w-full items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 md:order-none md:ml-auto md:w-80">
            <Search className="size-4 text-muted-foreground" />
            <input
              type="search" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Ankara, Shweshwe, Kente…" aria-label="Search products"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
          <Button variant="bag" size="default" className="ml-auto md:ml-0" onClick={openBag}>
            <ShoppingBag /> Bag ({count})
          </Button>
        </div>
        <nav aria-label="Departments" className="border-t border-border bg-cream">
          <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-2 px-5 py-3">
            <button onClick={() => pick("new")} className="rounded-full border border-gold/50 px-4 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-gold hover:text-gold-foreground">
              New arrivals
            </button>
            {departments.map((d) =>
              d.enabled ? (
                <button key={d.id} onClick={() => pick(d.id)} className="rounded-full border border-gold/50 px-4 py-1.5 text-sm text-foreground transition-colors hover:bg-gold hover:text-gold-foreground">
                  {d.label}
                </button>
              ) : (
                <span key={d.id} aria-disabled="true" className="flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground/70">
                  {d.label}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[0.6rem] uppercase tracking-wider">Soon</span>
                </span>
              ),
            )}
          </div>
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden bg-cream">
          <img src={heroImg} alt="Woman in a South African Ankara print gown" width={1600} height={1008} className="absolute inset-0 size-full object-cover object-[70%_center]" />
          <div className="absolute inset-0 bg-hero-fade" />
          <div className="relative mx-auto flex min-h-[560px] max-w-7xl items-center px-5 py-20 md:px-10">
            <div className="max-w-xl animate-rise text-foreground">
              <p className="eyebrow text-gold">Celebrating African style</p>
              <h1 className="mt-4 text-5xl font-bold leading-[1.02] md:text-7xl">
                Wear your story.
                <br />
                <em className="text-gold">Live your culture.</em>
              </h1>
              <p className="mt-6 max-w-md leading-relaxed text-foreground/75">
                South African Ankara and Shweshwe pieces, with treasured prints from across the continent — made for women, men, kids and whole families who wear them proudly.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="gold" size="xl" onClick={() => pick("women")}>Shop women</Button>
                {openDepts.some((d) => d.id === "men") && <Button variant="bag" size="xl" className="bg-background/70" onClick={() => pick("men")}>Shop men</Button>}
                {openDepts.some((d) => d.id === "kids") && <Button variant="bag" size="xl" className="bg-background/70" onClick={() => pick("kids")}>Shop kids</Button>}
                {openDepts.some((d) => d.id === "family") && <Button variant="bag" size="xl" className="bg-background/70" onClick={() => pick("family")}>Family sets</Button>}
              </div>
            </div>
          </div>
        </section>
        <div className="kente-rule" />

        {newArrivals.length > 0 && (
          <section className="bg-cream">
            <div className="mx-auto max-w-7xl px-5 py-14 md:px-10">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="eyebrow text-gold">Just landed</p>
                  <h2 className="mt-2 text-4xl font-bold">New arrivals</h2>
                </div>
                <button onClick={() => pick("new")} className="text-sm font-semibold text-gold underline-offset-4 hover:underline">See all new pieces</button>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
                {newArrivals.map((p) => card(p))}
              </div>
            </div>
          </section>
        )}

        <section id="collection" className="mx-auto max-w-7xl scroll-mt-32 px-5 py-16 md:px-10">
          <div className="text-center">
            <p className="eyebrow text-gold">The collection</p>
            <h2 className="mt-2 text-4xl font-bold md:text-5xl">Shop African fashion</h2>
            <p className="mt-3 text-muted-foreground">
              {openDepts.map((d) => d.label).join(" & ")}
              {departments.some((d) => !d.enabled) && ` · ${departments.filter((d) => !d.enabled).map((d) => d.label).join(" & ")} arriving soon`}
            </p>
          </div>

          <div className="my-8 flex flex-wrap justify-center gap-2">
            {(["all", "new", ...openDepts.map((d) => d.id)] as Filter[]).map((f) => (
              <Button key={f} variant="chip" size="sm" className="h-9 rounded-full px-5" data-active={filter === f} onClick={() => setFilter(f)}>
                {f === "all" ? `All (${visibleProducts(products, departments).length})` : f === "new" ? "New arrivals" : departments.find((d) => d.id === f)?.label}
              </Button>
            ))}
          </div>

          {list.length ? (
            <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
              {list.map((p) => card(p))}
            </div>
          ) : (
            <p className="py-16 text-center text-muted-foreground">{query ? `No pieces match “${query}”.` : "No pieces here yet."}</p>
          )}
        </section>

        <section className="bg-sand/60">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 text-center sm:grid-cols-3 md:px-10">
            {[
              { icon: Sparkles, t: "Culture-led style", s: "African inspiration, modern expression" },
              { icon: ShieldCheck, t: "Pay on confirmation", s: "Online payments coming soon" },
              { icon: Truck, t: "Delivery options", s: "Shipping across South Africa" },
            ].map(({ icon: Icon, t, s }) => (
              <div key={t}>
                <Icon className="mx-auto size-6 text-gold" />
                <p className="mt-3 font-display text-xl font-semibold">{t}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="contact" className="mx-auto max-w-7xl px-5 py-16 md:px-10">
          <div className="text-center">
            <p className="eyebrow text-gold">Get in touch</p>
            <h2 className="mt-2 text-4xl font-bold">Visit or contact us</h2>
          </div>
          <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-3">
            <div className="border border-border bg-card p-6 text-center">
              <MapPin className="mx-auto size-6 text-gold" />
              <p className="mt-3 font-display text-xl font-semibold">Address</p>
              <address className="mt-2 text-sm not-italic leading-relaxed text-muted-foreground">
                {SHOP_CONTACT.addressLines.map((l) => <span key={l} className="block">{l}</span>)}
              </address>
            </div>
            <a href={whatsappLink(SHOP_CONTACT.phone, "Hi Tsholo R Fashion House, I'd like to ask about")} target="_blank" rel="noreferrer" className="border border-border bg-card p-6 text-center transition-shadow hover:shadow-card">
              <MessageCircle className="mx-auto size-6 text-gold" />
              <p className="mt-3 font-display text-xl font-semibold">WhatsApp</p>
              <p className="mt-2 text-sm text-muted-foreground">{SHOP_CONTACT.phone}</p>
              <p className="mt-1 text-xs font-semibold text-gold">Chat with us</p>
            </a>
            <a href={telLink(SHOP_CONTACT.phone)} className="border border-border bg-card p-6 text-center transition-shadow hover:shadow-card">
              <Phone className="mx-auto size-6 text-gold" />
              <p className="mt-3 font-display text-xl font-semibold">Call us</p>
              <p className="mt-2 text-sm text-muted-foreground">{SHOP_CONTACT.phone}</p>
              <p className="mt-1 text-xs font-semibold text-gold">Tap to call</p>
            </a>
          </div>
        </section>
      </main>

      <div className="kente-rule" />
      <footer className="bg-cream py-10 text-center">
        <img src={LOGO_SRC} alt="Tsholo R Fashion House" width={632} height={276} loading="lazy" className="mx-auto h-24 w-auto" />
        <p className="mt-2 text-sm text-muted-foreground">Wear African. Live African. Be Proud.</p>
        <p className="mt-4 px-5 text-sm text-muted-foreground">{SHOP_CONTACT.addressLines.join(", ")}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Phone & WhatsApp:{" "}
          <a href={whatsappLink(SHOP_CONTACT.phone)} target="_blank" rel="noreferrer" className="font-semibold text-gold underline-offset-4 hover:underline">{SHOP_CONTACT.phone}</a>
        </p>
        <Link to="/admin" className="mt-4 inline-block text-xs text-muted-foreground underline-offset-4 hover:underline">Owner sign in</Link>
      </footer>

      <a
        href={whatsappLink(SHOP_CONTACT.phone, "Hi Tsholo R Fashion House, I'd like to ask about")}
        target="_blank" rel="noreferrer" aria-label="Chat with us on WhatsApp"
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-gold px-4 py-3 text-sm font-semibold text-gold-foreground shadow-card transition-transform hover:scale-105"
      >
        <MessageCircle className="size-5" /> <span className="hidden sm:inline">WhatsApp us</span>
      </a>

      {data.shopVideo && <ShopVideo src={data.shopVideo} />}

      <ProductDialog product={viewing} mainImage={viewing ? images[viewing.id] : undefined} onClose={() => setViewing(null)} onAdd={add} />

      <Sheet open={bagOpen} onOpenChange={setBagOpen}>
        <SheetContent className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">
              {step === "details" ? "Your details" : step === "done" ? "Order received" : "Your bag"}
            </SheetTitle>
          </SheetHeader>

          {step === "done" && placed ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <CheckCircle2 className="size-12 text-gold" />
              <p className="mt-4 font-display text-3xl font-bold">Thank you!</p>
              <p className="mt-2 text-muted-foreground">Order #{placed.orderNumber} · {formatRand(placed.total)}</p>
              <p className="mt-4 max-w-xs text-sm text-muted-foreground">We'll contact you to confirm your order and arrange payment and delivery.</p>
              <a href={whatsappLink(SHOP_CONTACT.phone, `Hi, I just placed order #${placed.orderNumber}`)} target="_blank" rel="noreferrer" className="mt-3 text-sm font-semibold text-gold underline-offset-4 hover:underline">
                Questions? WhatsApp us on {SHOP_CONTACT.phone}
              </a>
              <Button variant="gold" className="mt-6" onClick={() => { setBagOpen(false); setStep("bag"); }}>Keep shopping</Button>
            </div>
          ) : step === "details" ? (
            <form onSubmit={submitOrder} className="flex flex-1 flex-col gap-4 overflow-y-auto px-1">
              <div className="space-y-1.5"><Label htmlFor="o-name">Full name</Label><Input id="o-name" name="name" required minLength={2} maxLength={100} /></div>
              <div className="space-y-1.5"><Label htmlFor="o-phone">Phone (WhatsApp)</Label><Input id="o-phone" name="phone" type="tel" required minLength={7} maxLength={20} /></div>
              <div className="space-y-1.5"><Label htmlFor="o-email">Email (optional)</Label><Input id="o-email" name="email" type="email" maxLength={255} /></div>
              <div className="space-y-1.5"><Label htmlFor="o-address">Delivery address</Label><Textarea id="o-address" name="address" required minLength={5} maxLength={500} /></div>
              <div className="space-y-1.5"><Label htmlFor="o-notes">Notes (fitting, colour…)</Label><Textarea id="o-notes" name="notes" maxLength={500} /></div>
              <div className="mt-auto space-y-3 border-t border-border pt-4">
                <div className="flex justify-between text-lg font-semibold"><span>Total</span><span>{formatRand(total)}</span></div>
                <Button type="submit" variant="gold" size="xl" className="w-full" disabled={busy}>{busy ? "Placing order…" : "Place order"}</Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("bag")}>Back to bag</Button>
                <p className="bg-accent p-3 text-xs text-muted-foreground">No payment is taken now — we'll confirm with you first.</p>
              </div>
            </form>
          ) : (
            <>
              <div className="flex-1 space-y-4 overflow-y-auto">
                {cart.length === 0 && <p className="py-10 text-center text-muted-foreground">Your bag is empty.</p>}
                {cart.map((l) => (
                  <div key={l.key} className="flex gap-3 border-b border-border pb-4">
                    {images[l.id] ? <img src={images[l.id]} alt={l.name} className="h-20 w-16 object-cover" /> : <div className="h-20 w-16 bg-muted" />}
                    <div className="flex-1">
                      <p className="font-display text-lg leading-tight">{l.name}</p>
                      <p className="text-xs text-muted-foreground">{l.size ? `Size ${l.size} · ` : ""}{l.fabric}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Button variant="outline" size="icon" className="size-7" aria-label="Remove one" onClick={() => change(l.key, -1)}><Minus /></Button>
                        <span className="w-5 text-center text-sm">{l.qty}</span>
                        <Button variant="outline" size="icon" className="size-7" aria-label="Add one" onClick={() => change(l.key, 1)}><Plus /></Button>
                      </div>
                    </div>
                    <p className="font-semibold">{formatRand(l.price * l.qty)}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex justify-between text-lg font-semibold"><span>Total</span><span>{formatRand(total)}</span></div>
                <Button variant="gold" size="xl" className="w-full" disabled={!cart.length} onClick={() => setStep("details")}>Checkout</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
