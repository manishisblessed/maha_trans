"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { IconTile, type IconTone } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

/**
 * QuickActions — TRANSPE treatment: horizontal "counter button" rows (icon
 * left, label + hint right, arrow on hover) instead of vertical tiles. Each
 * overview passes the 4–8 actions that matter for its role. Scrolls
 * horizontally on small screens, spreads out as a grid on desktop.
 */
export type QuickAction = {
  label: string;
  href: string;
  icon: PhosphorIcon;
  tone?: IconTone;
  /** Tiny supporting text under the label. */
  hint?: string;
};

export function QuickActions({
  actions,
  title = "Quick actions",
  className,
}: {
  actions: QuickAction[];
  title?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (actions.length === 0) return null;

  return (
    <nav aria-label={title} className={cn("min-w-0", className)}>
      <ul className="scrollbar-none -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-3 xl:grid-cols-4">
        {actions.slice(0, 8).map((a, i) => (
          <motion.li
            key={a.href + a.label}
            className="shrink-0 md:shrink"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduce ? 0 : 0.4,
              delay: reduce ? 0 : 0.08 + i * 0.04,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Link
              href={a.href}
              className="group relative flex w-[13.5rem] items-center gap-3 overflow-hidden rounded-2xl border border-ink-100 bg-white py-3 pl-3 pr-9 transition-[transform,box-shadow,border-color] duration-300 ease-out focus-energy hover:-translate-y-0.5 hover:border-accent-200 hover:shadow-energy-sm md:w-auto"
            >
              <IconTile
                icon={a.icon}
                tone={a.tone ?? "brand"}
                size="md"
                className="shrink-0 transition-transform duration-300 group-hover:scale-105"
              />
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[13px] font-semibold text-ink-900">
                  {a.label}
                </span>
                {a.hint && (
                  <span className="mt-0.5 block truncate text-[11px] text-ink-500">{a.hint}</span>
                )}
              </span>
              <span
                aria-hidden
                className="absolute right-3 top-1/2 -translate-y-1/2 translate-x-1 text-ink-300 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-accent-600 group-hover:opacity-100"
              >
                →
              </span>
            </Link>
          </motion.li>
        ))}
      </ul>
    </nav>
  );
}
