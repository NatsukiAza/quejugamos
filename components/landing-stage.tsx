"use client";

import { useEffect, useState } from "react";
import { headerImageUrl } from "@/lib/format";

type Phase = "boot" | "enter" | "intersect" | "spin" | "chosen" | "reset";

const SHARED = [550, 892970, 322330] as const;
const STRIP = [...Array.from({ length: 5 }, () => SHARED).flat(), 892970];
const LAST = STRIP.length - 1;
const REEL_H = 131;

const LEFT = [
  { appid: 730, slot: "l0", kind: "only" },
  { appid: 570, slot: "l1", kind: "only" },
  { appid: 550, slot: "s0", kind: "keep" },
  { appid: 892970, slot: "s1", kind: "keep" },
  { appid: 322330, slot: "s2", kind: "keep" },
] as const;

const RIGHT = [
  { appid: 252490, slot: "r0", kind: "only" },
  { appid: 381210, slot: "r1", kind: "only" },
  { appid: 550, slot: "d0", kind: "drop" },
  { appid: 892970, slot: "d1", kind: "drop" },
  { appid: 322330, slot: "d2", kind: "drop" },
] as const;

function sleep(ms: number, isCancelled: () => boolean) {
  let timer = 0;
  let settled = false;
  const detach = () => {
    settled = true;
    window.clearTimeout(timer);
  };

  const promise = new Promise<() => void>((resolve) => {
    let end = performance.now() + ms;
    const tick = () => {
      if (settled || isCancelled()) {
        detach();
        resolve(detach);
        return;
      }
      if (document.hidden) {
        end += 200;
        timer = window.setTimeout(tick, 200);
        return;
      }
      if (performance.now() < end) {
        timer = window.setTimeout(tick, Math.min(80, end - performance.now()));
        return;
      }
      detach();
      resolve(detach);
    };
    tick();
  });

  return Object.assign(promise, { detach });
}

function Capsule({ appid }: { appid: number }) {
  return (
    // Store headers come from Steam's CDN. The stage is decorative.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={headerImageUrl(appid)} alt="" width={460} height={215} draggable={false} />
  );
}

export function LandingStage({ landedLabel }: { landedLabel: string }) {
  const [phase, setPhase] = useState<Phase>("boot");
  const [offset, setOffset] = useState(LAST);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      setPhase("chosen");
      setOffset(LAST);
      setSpinning(false);
      return;
    }

    let cancelled = false;
    let stop = () => {};

    const wait = async (ms: number) => {
      stop();
      const pending = sleep(ms, () => cancelled);
      stop = pending.detach;
      await pending;
    };

    const run = async () => {
      await wait(40);
      while (!cancelled) {
        setPhase("enter");
        await wait(2000);
        if (cancelled) return;
        setPhase("intersect");
        await wait(1700);
        if (cancelled) return;
        setPhase("spin");
        setSpinning(false);
        setOffset(0);
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        if (cancelled) return;
        setSpinning(true);
        setOffset(LAST);
        await wait(2800);
        if (cancelled) return;
        setPhase("chosen");
        await wait(1800);
        if (cancelled) return;
        setSpinning(false);
        setPhase("reset");
        await wait(780);
      }
    };

    void run();
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  return (
    <div className="panel landing-stage-panel">
      <div className="landing-stage-clip">
        <div className="landing-stage" data-phase={phase} aria-hidden="true">
          <div className="landing-scene">
            {LEFT.map((card) => (
              <div key={card.slot} className={`landing-card landing-card-left slot-${card.slot} is-${card.kind}`}>
                <Capsule appid={card.appid} />
              </div>
            ))}
            {RIGHT.map((card) => (
              <div key={card.slot} className={`landing-card landing-card-right slot-${card.slot} is-${card.kind}`}>
                <Capsule appid={card.appid} />
              </div>
            ))}
            <div className={phase === "chosen" ? "landing-reel landing-reel-chosen" : "landing-reel"}>
              <div className="landing-reel-window">
                <div
                  className={spinning ? "landing-reel-track is-spinning" : "landing-reel-track"}
                  style={{ transform: `translateY(-${offset * REEL_H}px)` }}
                >
                  {STRIP.map((appid, index) => (
                    <div className="landing-reel-item" key={`${appid}-${index}`}>
                      <Capsule appid={appid} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="landing-landed">{landedLabel}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
