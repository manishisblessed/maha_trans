"use client";

import { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Tray } from "@phosphor-icons/react";
import { IconTile } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: keyof T | string;
  header: string;
  align?: "left" | "right" | "center";
  className?: string;
  render?: (row: T) => ReactNode;
};

/**
 * TRANSPE DataTable — v3 "Ledger sheet".
 *
 * `rounded-2xl` surface with a ruled double-weight header on white, zebra row
 * striping like a printed ledger, a friendly empty state and shimmer loading
 * rows. Semantic `<table>` markup and horizontal scrolling are preserved.
 *
 * Optional props: `emptyIcon`, `emptyAction`, `dense`, `stickyHeader`
 * (default true), `footer`.
 */
export function DataTable<T>({
  title,
  description,
  columns,
  data,
  action,
  empty = "Nothing here yet — new records will show up as they come in.",
  loading = false,
  loadingRows = 5,
  emptyIcon: EmptyIcon,
  emptyAction,
  dense = false,
  stickyHeader = true,
  footer,
}: {
  title?: string;
  description?: string;
  columns: Column<T>[];
  data: T[];
  action?: ReactNode;
  empty?: string;
  loading?: boolean;
  loadingRows?: number;
  /** Lucide icon shown in the empty state tile. */
  emptyIcon?: LucideIcon;
  /** Call-to-action rendered under the empty message (e.g. a Button). */
  emptyAction?: ReactNode;
  /** Tighter row padding for dense admin views. */
  dense?: boolean;
  /** Keep the header row pinned while the body scrolls. Default true. */
  stickyHeader?: boolean;
  /** Slot rendered under the table (pagination, totals, legends). */
  footer?: ReactNode;
}) {
  const cellPad = dense ? "px-4 py-2" : "px-5 py-3";

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-ink-100 bg-white">
      {(title || description || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            {title && (
              <h3 className="flex items-center gap-2.5 font-display text-base font-semibold tracking-[-0.02em] text-ink-950 md:text-lg">
                <span aria-hidden className="h-4 w-1 rounded-full bg-energy-gradient" />
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-0.5 truncate text-xs text-ink-500">{description}</p>
            )}
          </div>
          {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
        </div>
      )}

      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
          <thead
            className={cn(
              "text-left text-[10px] font-bold uppercase tracking-[0.14em] text-royal-500",
              stickyHeader && "sticky top-0 z-[1]"
            )}
          >
            <tr>
              {columns.map((c) => (
                <th
                  key={String(c.key)}
                  scope="col"
                  className={cn(
                    "whitespace-nowrap border-t border-ink-100 border-b-2 border-b-ink-200 bg-white",
                    cellPad,
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center"
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="text-ink-800">
            {loading ? (
              Array.from({ length: loadingRows }).map((_, r) => (
                <tr key={`sk-${r}`}>
                  {columns.map((c, i) => (
                    <td
                      key={String(c.key)}
                      className={cn("border-b border-ink-100", cellPad)}
                    >
                      <Skeleton
                        className={cn(
                          "h-3.5",
                          i === 0
                            ? "w-28"
                            : i === columns.length - 1
                              ? "ml-auto w-16"
                              : "w-24",
                          c.align === "right" && "ml-auto",
                          c.align === "center" && "mx-auto"
                        )}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-14">
                  <div className="mx-auto flex max-w-sm flex-col items-center text-center">
                    <span className="relative">
                      <span
                        aria-hidden
                        className="absolute inset-0 rounded-2xl bg-brand-200 opacity-40 blur-xl"
                      />
                      <IconTile tone="brand" size="xl" className="relative">
                        {EmptyIcon ? (
                          <EmptyIcon className="h-7 w-7" strokeWidth={1.5} aria-hidden />
                        ) : (
                          <Tray size={28} weight="duotone" aria-hidden />
                        )}
                      </IconTile>
                    </span>
                    <p className="mt-4 text-sm font-medium leading-relaxed text-ink-600">
                      {empty}
                    </p>
                    {emptyAction && (
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {emptyAction}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={(row as { id?: string | number }).id ?? i}
                  className={cn(
                    "group transition-colors hover:bg-accent-50/40",
                    i % 2 === 1 && "bg-ink-50/40"
                  )}
                >
                  {columns.map((c) => (
                    <td
                      key={String(c.key)}
                      className={cn(
                        "whitespace-nowrap border-b border-ink-50 transition-colors",
                        cellPad,
                        c.align === "right" && "text-right",
                        c.align === "center" && "text-center",
                        c.className
                      )}
                    >
                      {c.render
                        ? c.render(row)
                        : ((row as Record<string, unknown>)[
                            String(c.key)
                          ] as ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {footer && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-ink-50/40 px-5 py-3 text-sm text-ink-600">
          {footer}
        </div>
      )}
    </div>
  );
}
