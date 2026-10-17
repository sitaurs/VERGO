"use client";

import { useEffect, type RefObject } from "react";

const ease = "cubic-bezier(.16, 1, .3, 1)";

/** Keep native details/summary semantics; animate the resulting positions, never text dimensions. */
export function useFaqMotion(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root || !Element.prototype.animate) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const active = new Map<Element, Animation>();
    let frame = 0;

    function settle() {
      cancelAnimationFrame(frame);
      active.forEach(animation => animation.cancel());
      active.clear();
    }

    function animate(element: Element | null, keyframes: Keyframe[], duration: number, id: string) {
      if (!element) return;
      active.get(element)?.cancel();
      const animation = element.animate(keyframes, { duration, easing: ease });
      animation.id = id;
      active.set(element, animation);
      void animation.finished.then(() => {
        if (active.get(element) === animation) active.delete(element);
        animation.cancel();
      }).catch(() => { /* Rapid toggles, navigation, and preference changes settle immediately. */ });
    }

    function prepare(event: MouseEvent) {
      const summary = event.target instanceof Element ? event.target.closest("summary") : null;
      if (!summary?.parentElement?.hasAttribute("data-landing-faq-item") || preference.matches || document.hidden || event.defaultPrevented) return;
      const items = [...root!.querySelectorAll<HTMLElement>("[data-landing-faq-item]")];
      // Batch every read before canceling animations or writing any new styles.
      const before = items.map(element => element.getBoundingClientRect().top);
      settle();
      frame = requestAnimationFrame(() => {
        // Native exclusive details have now updated their final layout.
        const after = items.map(element => element.getBoundingClientRect().top);
        items.forEach((element, index) => {
          const delta = before[index] - after[index];
          if (Math.abs(delta) > .5) animate(element, [{ translate: `0 ${delta}px` }, { translate: "0 0" }], 280, "vergo-faq-layout");
        });
        const opened = root!.querySelector<HTMLElement>("[data-landing-faq-item][open]");
        if (!opened) return;
        animate(opened.querySelector("[data-landing-faq-answer]"), [{ opacity: .2, translate: "0 7px" }, { opacity: 1, translate: "0 0" }], 230, "vergo-faq-answer");
        animate(opened.querySelector("[data-landing-faq-icon]"), [{ rotate: "0deg", scale: "1" }, { rotate: "-7deg", scale: "1.08", offset: .3 }, { rotate: "0deg", scale: "1" }], 420, "vergo-faq-icon");
        animate(root!.querySelector("[data-landing-faq-react]"), [{ scale: "1" }, { scale: "1.025", offset: .35 }, { scale: "1" }], 560, "vergo-faq-feedback");
      });
    }

    function changed() { if (preference.matches || document.hidden) settle(); }
    root.addEventListener("click", prepare, true);
    preference.addEventListener("change", changed);
    document.addEventListener("visibilitychange", changed);
    return () => {
      settle();
      root.removeEventListener("click", prepare, true);
      preference.removeEventListener("change", changed);
      document.removeEventListener("visibilitychange", changed);
    };
  }, [ref]);
}
