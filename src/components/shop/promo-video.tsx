import { useCallback, useEffect, useRef, useState } from "react";
import { Play, X, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

type Phase = "hidden" | "entering" | "playing" | "exiting" | "idle";

/**
 * Professional brand / promo video.
 * - Auto-plays (muted) for a few seconds on first page open, then fades away.
 * - After that a discreet play button stays available; pressing it plays the video again.
 * - Not treated as a product — sits as an elegant overlay experience.
 */
export function PromoVideo({ src, className }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>("hidden");
  const [muted, setMuted] = useState(true);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const startPlayback = useCallback(
    (auto: boolean) => {
      clearTimer();
      setPhase("entering");
      // brief enter, then playing
      requestAnimationFrame(() => {
        setTimeout(() => setPhase("playing"), 50);
      });
      const v = videoRef.current;
      if (v) {
        v.currentTime = 0;
        v.muted = muted;
        const p = v.play();
        if (p) p.catch(() => {});
      }
      // Auto mode: play for a few seconds then fade out
      if (auto) {
        hideTimer.current = setTimeout(() => {
          setPhase("exiting");
          setTimeout(() => {
            setPhase("idle");
            setHasPlayedOnce(true);
            const vid = videoRef.current;
            if (vid) {
              vid.pause();
              vid.currentTime = 0;
            }
          }, 700);
        }, 6500); // ~6.5 seconds then disappear
      }
    },
    [muted],
  );

  // On open: automatic short play once
  useEffect(() => {
    if (!src || hasPlayedOnce) return;
    // small delay so the page settles, then auto-run
    const t = setTimeout(() => startPlayback(true), 900);
    return () => {
      clearTimeout(t);
      clearTimer();
    };
  }, [src, hasPlayedOnce, startPlayback]);

  useEffect(() => () => clearTimer(), []);

  const onVideoEnded = () => {
    // If user let it finish while manually opened, fade out to idle
    if (phase === "playing") {
      setPhase("exiting");
      setTimeout(() => {
        setPhase("idle");
        setHasPlayedOnce(true);
      }, 600);
    }
  };

  const close = () => {
    clearTimer();
    setPhase("exiting");
    setTimeout(() => {
      setPhase("idle");
      setHasPlayedOnce(true);
      const v = videoRef.current;
      if (v) {
        v.pause();
        v.currentTime = 0;
      }
    }, 500);
  };

  const reopen = () => {
    startPlayback(false); // manual: play full length, no auto-hide timer
  };

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      if (videoRef.current) videoRef.current.muted = next;
      return next;
    });
  };

  const visible = phase === "entering" || phase === "playing" || phase === "exiting";
  const showButton = phase === "idle" || phase === "hidden";

  return (
    <>
      {/* Floating professional play control — always available after first auto play */}
      {showButton && (
        <button
          type="button"
          onClick={reopen}
          aria-label="Watch brand video"
          className={cn(
            "fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full",
            "bg-gold text-gold-foreground shadow-lg shadow-gold/30",
            "transition-all duration-500 hover:scale-105 hover:shadow-xl",
            "animate-rise focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
            className,
          )}
        >
          <Play className="size-6 fill-current" />
        </button>
      )}

      {/* Overlay video experience */}
      <div
        aria-hidden={!visible}
        className={cn(
          "fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8",
          "transition-all duration-700 ease-out",
          visible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
          phase === "exiting" && "opacity-0 scale-[0.98]",
          phase === "entering" && "opacity-0 scale-[1.02]",
          phase === "playing" && "opacity-100 scale-100",
        )}
      >
        {/* Soft dark backdrop */}
        <div
          className="absolute inset-0 bg-foreground/70 backdrop-blur-sm"
          onClick={close}
        />

        {/* Video frame — elegant, not product-card style */}
        <div
          className={cn(
            "relative z-10 w-full max-w-4xl overflow-hidden rounded-2xl",
            "border border-gold/30 bg-background shadow-2xl",
            "ring-1 ring-gold/20",
          )}
        >
          <div className="relative aspect-video bg-foreground">
            <video
              ref={videoRef}
              src={src}
              playsInline
              muted={muted}
              onEnded={onVideoEnded}
              className="size-full object-contain"
              preload="auto"
            />

            {/* Top controls bar */}
            <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-foreground/60 to-transparent px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-background/90">
                Tsholo R · Brand film
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={muted ? "Unmute" : "Mute"}
                  className="flex size-9 items-center justify-center rounded-full bg-background/20 text-background backdrop-blur transition hover:bg-background/40"
                >
                  {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                </button>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close video"
                  className="flex size-9 items-center justify-center rounded-full bg-background/20 text-background backdrop-blur transition hover:bg-background/40"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
