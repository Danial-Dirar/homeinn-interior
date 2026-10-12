"use client";

import type { CSSProperties, ElementType, ReactNode } from "react";
import { useReveal } from "@/hooks/use-reveal";

/**
 * An entrance as content scrolls into view. `rise` lifts and fades text and
 * cards in; `wipe` unveils an image from the bottom up, like the blueprints
 * drawing themselves. The motion lives in globals.css, keyed off
 * `data-revealed`, so this adds no animation runtime.
 *
 * Waiting content is transparent, never `visibility: hidden`: it stays in the
 * accessibility tree and the tab order, and focus reaching it finishes the
 * entrance. Visitors without JavaScript get it plainly (a <noscript> style in
 * the layout).
 */
export function Reveal({
  as: Tag = "div",
  variant = "rise",
  delay = 0,
  className,
  style,
  children,
}: {
  as?: ElementType;
  variant?: "rise" | "wipe";
  /** Milliseconds, for a stagger across a list. */
  delay?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { ref, revealed } = useReveal<HTMLElement>();
  return (
    <Tag
      ref={ref}
      data-reveal={variant}
      data-revealed={revealed ? "true" : "false"}
      className={className}
      style={delay ? { ...style, transitionDelay: `${delay}ms` } : style}
    >
      {children}
    </Tag>
  );
}
