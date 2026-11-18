import { useEffect, useRef, useState } from "react";
import { Play, Volume2, VolumeX, X } from "lucide-react";

import { autoShowWindows } from "@/lib/shop-video";
import { cn } from "@/lib/utils";

/**
 * The shop's one video: a floating card that plays by itself when the shop opens,
 * hides, appears once more, then waits behind a "Watch our story" button.
 */
export function ShopVideo({ src }: { src: string }) {
  // The viewing link changes on every load, so the player is only drawn in the browser.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <Player src={src} /> : null;
}

function Player({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [manual, setManual] = useState(false);
  const [muted, setMuted] = useState(true);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const playFromStart = (withSound: boolean) => {
    const v = ref.current;
    if (!v) return;
    v.muted = !withSound;
    setMuted(!withSound);
    v.currentTime = 0;
    void v.play().catch(() => {
      // Browsers refuse sound without a tap; fall back to silent playback.
      v.muted = true;
      setMuted(true);
      void v.play().catch(() => {});
    });
  };

  const hide = () => {
    setVisible(false);
    ref.current?.pause();
  };

  useEffect(() => {
    for (const w of autoShowWindows()) {
      timers.current.push(
        window.setTimeout(() => { setVisible(true); playFromStart(false); }, w.start * 1000),
        window.setTimeout(hide, w.end * 1000),
      );
    }
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const openManually = () => {
    clearTimers();
    setManual(true);
    setVisible(true);
    playFromStart(true);
  };

  const close = () => {
    clearTimers();
    hide();
  };

  return (
    <>
      <div
        aria-hidden={!visible}
        className={cn(
          "fixed bottom-5 left-5 z-30 w-40 origin-bottom-left overflow-hidden rounded-md border border-gold/40 bg-card shadow-card transition-all duration-700 sm:w-56 md:w-64",
          visible ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-6 scale-95 opacity-0",
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border bg-cream px-3 py-1.5">
          <span className="eyebrow truncate text-[0.6rem] text-gold">Tsholo R · Our story</span>
          <button onClick={close} aria-label="Close video" className="grid size-6 place-items-center rounded-full hover:bg-accent">
            <X className="size-3.5" />
          </button>
        </div>
        <div className="relative bg-foreground/5">
          <video
            ref={ref}
            src={src}
            muted={muted}
            playsInline
            preload="auto"
            onEnded={() => manual && hide()}
            onClick={() => (ref.current?.paused ? void ref.current.play() : ref.current?.pause())}
            className="block max-h-[55vh] w-full cursor-pointer object-cover"
          />
          <button
            onClick={() => {
              const v = ref.current;
              if (!v) return;
              v.muted = !v.muted;
              setMuted(v.muted);
            }}
            aria-label={muted ? "Turn sound on" : "Turn sound off"}
            className="absolute bottom-2 right-2 grid size-8 place-items-center rounded-full bg-background/85 text-foreground shadow-card"
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
        </div>
      </div>

      <button
        onClick={openManually}
        aria-label="Watch our story video"
        className={cn(
          "fixed bottom-5 left-5 z-30 flex items-center gap-2 rounded-full border border-gold/50 bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-card transition-all duration-500 hover:bg-gold hover:text-gold-foreground",
          visible ? "pointer-events-none opacity-0" : "opacity-100",
        )}
      >
        <span className="grid size-6 place-items-center rounded-full bg-gold text-gold-foreground"><Play className="size-3 fill-current" /></span>
        <span className="hidden sm:inline">Watch our story</span>
      </button>
    </>
  );
}
