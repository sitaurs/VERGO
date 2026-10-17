"use client";

import { useEffect, useRef, type RefObject } from "react";

const ease = "cubic-bezier(.16, 1, .3, 1)";
const entrySelector = "[data-landing-enter]";
const ambientSelector = "[data-landing-float]";

/** Landing-only enhancement: server content is always visible and navigation stays native. */
export function useLandingMotion(rootRef: RefObject<HTMLDivElement | null>, paused: boolean) {
  const control = useRef<((paused: boolean) => void) | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !window.IntersectionObserver || !HTMLElement.prototype.animate) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const entries = new Map<HTMLElement, Animation>();
    const ambient = new Map<HTMLElement, Animation>();
    const visible = new Set<HTMLElement>();
    const seen = new WeakSet<HTMLElement>();
    const hovered = new Set<HTMLElement>();
    let userPaused = false;
    let disposed = false;

    function cancelEntries() {
      entries.forEach(animation => animation.cancel());
      entries.clear();
    }

    function sync() {
      if (disposed) return;
      root!.dataset.landingMotionState = preference.matches ? "reduced" : userPaused ? "paused" : "running";
      if (preference.matches) {
        cancelEntries();
        ambient.forEach(animation => animation.cancel());
        ambient.clear();
        return;
      }
      for (const [index, element] of [...root!.querySelectorAll<HTMLElement>(ambientSelector)].entries()) {
        const eligible = visible.has(element) && !document.hidden && !userPaused &&
          !hovered.has(element) && !element.contains(document.activeElement);
        let animation = ambient.get(element);
        if (eligible && !animation) {
          const kind = element.dataset.landingFloat;
          const direction = index % 2 ? -1 : 1;
          const frames: Keyframe[] = kind === "leaf" ? [
            { rotate: "0deg" }, { rotate: "4deg" }, { rotate: "0deg" },
          ] : kind === "orbit" ? [{ opacity: .3 }, { opacity: .85 }, { opacity: .3 }]
            : kind === "scan" ? [
              { translate: "0 -130%", opacity: 0, offset: 0 },
              { translate: "0 0", opacity: .7, offset: .12 },
              { translate: "0 400%", opacity: 0, offset: .62 },
              { translate: "0 400%", opacity: 0, offset: 1 },
            ] : [
              { translate: "0 0" },
              { translate: `${direction * 3}px ${kind === "shape" ? 12 : kind === "art" ? -6 : -9}px` },
              { translate: "0 0" },
            ];
          // Observe the stationary photo frame; observing its moving beam can freeze it outside the clip.
          const target = kind === "scan" ? element.querySelector("[data-landing-scan]") ?? element : element;
          animation = target.animate(frames, {
            // Each illustration has one short arrival sequence; no perpetual motion or new pause button.
            duration: kind === "scan" ? 4800 : 4200 + (index % 3) * 180,
            iterations: 1, easing: "ease-in-out",
          });
          animation.id = "vergo-ambient";
          ambient.set(element, animation);
        }
        if (animation) {
          if (animation.playState === "finished") continue;
          if (eligible) animation.play();
          else animation.pause();
        }
      }
    }

    const observer = new IntersectionObserver(records => {
      for (const record of records) {
        const element = record.target as HTMLElement;
        if (element.matches(ambientSelector)) {
          if (record.isIntersecting && element.getBoundingClientRect().width > 0) visible.add(element);
          else visible.delete(element);
        }
        if (!record.isIntersecting || !element.matches(entrySelector) || seen.has(element)) continue;
        seen.add(element);
        if (!element.matches(ambientSelector)) observer.unobserve(element);
        if (preference.matches || document.hidden || userPaused) continue;
        const heroCard = element.dataset.landingEnter === "hero-card";
        const order = Number(element.dataset.landingOrder ?? 0);
        const faqCard = element.dataset.landingEnter === "faq";
        // Floating cards use scale for entry, translate for idle, and CSS transform for hover.
        const animation = element.animate(heroCard ? [
          { opacity: .25, scale: ".96" }, { opacity: 1, scale: "1" },
        ] : [
          { opacity: .25, translate: `0 ${faqCard ? 14 : element.dataset.landingEnter === "title" ? 20 : 26}px` },
          { opacity: 1, translate: "0 0" },
        ], { duration: faqCard ? 480 : heroCard ? 780 : 680, delay: Math.min(order * (faqCard ? 55 : 85), 340), easing: ease, fill: "backwards" });
        animation.id = "vergo-landing-entry";
        entries.set(element, animation);
        void animation.finished.then(() => {
          if (entries.get(element) === animation) entries.delete(element);
          animation.cancel();
        }).catch(() => { /* Pause, navigation and preference changes settle safely. */ });
      }
      sync();
    }, { threshold: .12 });
    root.querySelectorAll(`${entrySelector}, ${ambientSelector}`).forEach(element => observer.observe(element));

    function interaction(event: Event) {
      const target = event.target instanceof Element ? event.target : null;
      for (const floating of root!.querySelectorAll<HTMLElement>(ambientSelector)) {
        if (!target || !floating.contains(target)) continue;
        if (event.type === "pointerover") hovered.add(floating);
        if (event.type === "pointerout" && !floating.contains((event as PointerEvent).relatedTarget as Node | null)) hovered.delete(floating);
      }
      // Never move a control between pointer-down/up or while it has keyboard focus.
      if (["pointerdown", "focusin"].includes(event.type)) {
        for (const [element, animation] of entries) if (target && element.contains(target)) {
          animation.cancel(); entries.delete(element);
        }
      }
      sync();
    }
    const changed = () => {
      if (preference.matches || document.hidden) cancelEntries();
      sync();
    };
    control.current = value => { userPaused = value; if (value) cancelEntries(); sync(); };
    const events = ["pointerover", "pointerout", "pointerdown", "focusin", "focusout"];
    events.forEach(event => root.addEventListener(event, interaction, true));
    preference.addEventListener("change", changed);
    document.addEventListener("visibilitychange", changed);
    sync();
    return () => {
      disposed = true;
      control.current = null;
      observer.disconnect();
      cancelEntries();
      ambient.forEach(animation => animation.cancel());
      ambient.clear();
      delete root.dataset.landingMotionState;
      events.forEach(event => root.removeEventListener(event, interaction, true));
      preference.removeEventListener("change", changed);
      document.removeEventListener("visibilitychange", changed);
    };
  }, [rootRef]);

  useEffect(() => { control.current?.(paused); }, [paused]);
}
