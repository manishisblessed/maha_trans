"use client";

import { useCallback, useEffect, useState } from "react";
import { Globe, CheckCircle, XCircle, PauseCircle, RefreshCw, Search, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DataTable } from "@/components/dashboard/DataTable";
import { StatusChip } from "@/components/dashboard/patterns";
import { Badge } from "@/components/ui/Badge";

type Tenant = {
  id: string;
  brandName: string;
  tagline: string | null;
  logoUrl: string | null;
  primaryColor: string;
  subdomain: string | null;
  customDomain: string | null;
  supportEmail: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    userCode: string | null;
    status: string;
    _count: { tenantMembers: number };
  };
};

const STATUS_ICON = {
  LIVE: CheckCircle,
  SUSPENDED: PauseCircle,
  DRAFT: XCircle,
};

const STATUS_COLOR: Record<string, string> = {
  LIVE: "text-emerald-600",
  SUSPENDED: "text-amber-600",
  DRAFT: "text-ink-400",
};

export default function AdminWhitelabelPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    params.set("page", String(page));
    try {
      const res = await fetch(`/api/admin/whitelabel?${params}`);
      const data = await res.json();
      setTenants(data.tenants ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, status: string) {
    setActing(id);
    try {
      await fetch("/api/admin/whitelabel", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      await load();
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform · Admin"
        title="White-label tenants"
        description="View, activate, and suspend white-label portals across the platform."
        actions={
          <Button variant="secondary" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input
            className="pl-9"
            placeholder="Search brand, domain, owner…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        {(["", "LIVE", "DRAFT", "SUSPENDED"] as const).map((s) => (
          <button
            key={s || "all"}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              statusFilter === s
                ? "bg-ink-900 text-white"
                : "bg-ink-100 text-ink-600 hover:bg-ink-200"
            }`}
          >
            {s || "All"}
          </button>
        ))}
        <span className="ml-auto text-sm text-ink-500">{total} tenants</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-ink-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">
              <th className="px-5 py-4">Brand</th>
              <th className="px-5 py-4">Domain</th>
              <th className="px-5 py-4">Owner</th>
              <th className="px-5 py-4">Members</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {loading && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-ink-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && tenants.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-ink-400">
                  No white-label tenants found.
                </td>
              </tr>
            )}
            {tenants.map((t) => {
              const Icon = STATUS_ICON[t.status as keyof typeof STATUS_ICON] ?? XCircle;
              const liveUrl = t.customDomain
                ? `https://${t.customDomain}`
                : t.subdomain
                  ? `https://${t.subdomain}.${process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "transpe.in"}`
                  : null;
              return (
                <tr key={t.id} className="hover:bg-ink-50/50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {t.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.logoUrl} alt={t.brandName} className="h-8 w-8 rounded-lg object-contain border border-ink-100" />
                      ) : (
                        <span
                          className="grid h-8 w-8 place-items-center rounded-lg text-xs font-bold text-white"
                          style={{ background: t.primaryColor }}
                        >
                          {t.brandName.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <div>
                        <p className="font-semibold text-ink-900">{t.brandName}</p>
                        {t.tagline && <p className="text-xs text-ink-400 truncate max-w-[180px]">{t.tagline}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-0.5">
                      {t.customDomain && (
                        <div className="flex items-center gap-1">
                          <Globe className="h-3 w-3 text-ink-400 shrink-0" />
                          <span className="font-mono text-xs text-ink-700">{t.customDomain}</span>
                          {liveUrl && (
                            <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="text-ink-400 hover:text-ink-700">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      )}
                      {t.subdomain && (
                        <p className="font-mono text-xs text-ink-400">
                          {t.subdomain}.{process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "transpe.in"}
                        </p>
                      )}
                      {!t.customDomain && !t.subdomain && (
                        <span className="text-xs text-ink-300">No domain set</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div>
                      <p className="font-medium text-ink-900">{t.user.name}</p>
                      <p className="text-xs text-ink-400">{t.user.email}</p>
                      <p className="text-xs text-ink-400">{t.user.role.replace(/_/g, " ")}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 tabular-nums">
                    <Badge variant="royal" size="sm">
                      {t.user._count.tenantMembers} users
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`h-4 w-4 ${STATUS_COLOR[t.status] ?? "text-ink-400"}`} />
                      <span className={`text-xs font-semibold ${STATUS_COLOR[t.status] ?? "text-ink-400"}`}>
                        {t.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {t.status !== "LIVE" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => updateStatus(t.id, "LIVE")}
                          disabled={acting === t.id}
                        >
                          Activate
                        </Button>
                      )}
                      {t.status !== "SUSPENDED" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateStatus(t.id, "SUSPENDED")}
                          disabled={acting === t.id}
                        >
                          Suspend
                        </Button>
                      )}
                      {t.status === "SUSPENDED" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => updateStatus(t.id, "DRAFT")}
                          disabled={acting === t.id}
                        >
                          Reset to Draft
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between text-sm">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-ink-500">Page {page} of {Math.ceil(total / 20)}</span>
          <Button variant="secondary" disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
