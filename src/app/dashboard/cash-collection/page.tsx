"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  RefreshCw,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  BanknoteIcon,
  Wallet,
  ArrowDownToLine,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatINR } from "@/lib/utils";
import { useAuth } from "@/lib/useAuth";

// ─── Types ────────────────────────────────────────────────────────────────────

type BankAccount = {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string | null;
  upiId: string | null;
  acceptedModes: ("NEFT" | "RTGS" | "UPI" | "CASH_DEPOSIT")[];
  chargeType: "FLAT" | "PERCENT";
  chargeValue: number;
  chargeGstInclusive: boolean;
  defaultTargetWallet: "PRIMARY" | "DMT" | "AEPS";
};

type Collection = {
  id: string;
  mode: "NEFT" | "RTGS" | "UPI" | "CASH_DEPOSIT";
  amount: number;
  utr: string | null;
  paymentDate: string | null;
  slipUrl: string | null;
  userRemarks: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  adminRemarks: string | null;
  chargeAmount: number | null;
  netAmount: number | null;
  targetWallet: "PRIMARY" | "DMT" | "AEPS" | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  companyBankAccount: {
    id: string;
    accountName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
  };
};

// ─── Constants ────────────────────────────────────────────────────────────────

const MODE_LABELS: Record<string, string> = {
  NEFT: "NEFT",
  RTGS: "RTGS",
  UPI: "UPI",
  CASH_DEPOSIT: "Cash Deposit",
};

const WALLET_LABELS: Record<string, string> = {
  PRIMARY: "Main Wallet",
  DMT: "DMT Wallet",
  AEPS: "AEPS Wallet",
};

const WALLET_COLORS: Record<string, string> = {
  PRIMARY: "text-blue-600",
  DMT: "text-violet-600",
  AEPS: "text-emerald-600",
};

const STATUS_BADGE: Record<string, "success" | "danger" | "warning"> = {
  APPROVED: "success",
  REJECTED: "danger",
  PENDING: "warning",
  CANCELLED: "danger",
};

// ─── Charge preview helper ─────────────────────────────────────────────────

function computeCharge(
  amount: number,
  chargeType: "FLAT" | "PERCENT",
  chargeValue: number
) {
  if (!amount || amount <= 0) return { charge: 0, net: 0 };
  const charge =
    chargeType === "PERCENT"
      ? Math.round((amount * chargeValue) / 100 * 100) / 100
      : chargeValue;
  const cappedCharge = Math.min(charge, amount);
  return { charge: cappedCharge, net: Math.round((amount - cappedCharge) * 100) / 100 };
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function CashCollectionPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<Collection[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRow, setSelectedRow] = useState<Collection | null>(null);

  // Form state
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
  const [mode, setMode] = useState<"NEFT" | "RTGS" | "UPI" | "CASH_DEPOSIT">("NEFT");
  const [amount, setAmount] = useState("");
  const [utr, setUtr] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [slipUrl, setSlipUrl] = useState("");
  const [userRemarks, setUserRemarks] = useState("");
  const [targetWallet, setTargetWallet] = useState<"PRIMARY" | "DMT" | "AEPS">("PRIMARY");
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setFetching(true);
      const [colRes, bankRes] = await Promise.all([
        fetch("/api/cash-collection"),
        fetch("/api/cash-collection/bank-accounts"),
      ]);
      if (!colRes.ok || !bankRes.ok) throw new Error("Failed to fetch");
      const [colJson, bankJson] = await Promise.all([colRes.json(), bankRes.json()]);
      setRows(colJson.collections);
      setBankAccounts(bankJson.accounts);
    } catch {
      toast.error("Could not load cash collection data");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // When bank changes, reset mode to first accepted mode
  useEffect(() => {
    if (selectedBank && !selectedBank.acceptedModes.includes(mode)) {
      setMode(selectedBank.acceptedModes[0]);
    }
    if (selectedBank) {
      setTargetWallet(selectedBank.defaultTargetWallet);
    }
  }, [selectedBank, mode]);

  // ── Charge preview ────────────────────────────────────────────────────────
  const parsedAmount = parseFloat(amount) || 0;
  const preview =
    selectedBank && parsedAmount > 0
      ? computeCharge(parsedAmount, selectedBank.chargeType, selectedBank.chargeValue)
      : null;

  // ── Submit new request ────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBank) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/cash-collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyBankAccountId: selectedBank.id,
          mode,
          amount: parsedAmount,
          utr: utr || undefined,
          paymentDate: paymentDate ? new Date(paymentDate).toISOString() : undefined,
          slipUrl: slipUrl || undefined,
          userRemarks: userRemarks || undefined,
          targetWallet,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Submission failed");
      toast.success("Cash collection request submitted successfully!");
      setShowForm(false);
      setAmount(""); setUtr(""); setPaymentDate(""); setSlipUrl(""); setUserRemarks("");
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Cancel a pending request ──────────────────────────────────────────────
  const handleCancel = async (id: string) => {
    setCancelling(id);
    try {
      const res = await fetch(`/api/cash-collection/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Cancel failed");
      toast.success("Request cancelled");
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setCancelling(null);
    }
  };

  // ─── Table columns ──────────────────────────────────────────────────────────
  const columns: Column<Collection>[] = [
    {
      key: "createdAt",
      header: "Date",
      render: (r) =>
        new Date(r.createdAt).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
    },
    {
      key: "companyBankAccount",
      header: "Bank Account",
      render: (r) => (
        <div>
          <div className="font-medium text-sm">{r.companyBankAccount.bankName}</div>
          <div className="text-xs text-gray-500">
            ···{r.companyBankAccount.accountNumber.slice(-4)} &bull; {r.companyBankAccount.ifscCode}
          </div>
        </div>
      ),
    },
    {
      key: "mode",
      header: "Mode",
      render: (r) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          {MODE_LABELS[r.mode]}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (r) => (
        <div>
          <div className="font-semibold">{formatINR(r.amount)}</div>
          {r.netAmount !== null && r.netAmount !== r.amount && (
            <div className="text-xs text-emerald-600">
              Net: {formatINR(r.netAmount)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "targetWallet",
      header: "Wallet",
      render: (r) =>
        r.targetWallet ? (
          <span className={`text-xs font-medium ${WALLET_COLORS[r.targetWallet]}`}>
            {WALLET_LABELS[r.targetWallet]}
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
    {
      key: "utr",
      header: "UTR / Ref",
      render: (r) => (
        <span className="text-xs font-mono">{r.utr ?? "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <Badge variant={STATUS_BADGE[r.status]}>{r.status}</Badge>,
    },
    {
      key: "id",
      header: "Action",
      render: (r) => (
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedRow(r)}
            className="text-xs text-blue-600 hover:underline"
          >
            View
          </button>
          {r.status === "PENDING" && (
            <button
              onClick={() => handleCancel(r.id)}
              disabled={cancelling === r.id}
              className="text-xs text-red-500 hover:underline disabled:opacity-50"
            >
              {cancelling === r.id ? "..." : "Cancel"}
            </button>
          )}
        </div>
      ),
    },
  ];

  // ─── Summary stats ──────────────────────────────────────────────────────────
  const pendingCount = rows.filter((r) => r.status === "PENDING").length;
  const totalApproved = rows
    .filter((r) => r.status === "APPROVED")
    .reduce((s, r) => s + (r.netAmount ?? r.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash Collection"
        description="Deposit funds via NEFT, RTGS, UPI, or Cash Deposit"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={fetching}>
              <RefreshCw className={`w-4 h-4 ${fetching ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-1" />
              New Request
            </Button>
          </div>
        }
      />

      {/* ── Wallet Info Banner ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { key: "PRIMARY", label: "Main Wallet", sub: "POS / PG Transactions", icon: Wallet, color: "blue" },
          { key: "DMT", label: "DMT Wallet", sub: "Money Transfer", icon: BanknoteIcon, color: "violet" },
          { key: "AEPS", label: "AEPS Wallet", sub: "AePS / Aadhaar-Pay", icon: ArrowDownToLine, color: "emerald" },
        ].map(({ key, label, sub, icon: Icon, color }) => (
          <div
            key={key}
            className={`rounded-xl border bg-${color}-50 border-${color}-100 px-4 py-3 flex items-center gap-3`}
          >
            <div className={`p-2 rounded-lg bg-${color}-100`}>
              <Icon className={`w-4 h-4 text-${color}-600`} />
            </div>
            <div>
              <div className={`text-sm font-semibold text-${color}-700`}>{label}</div>
              <div className="text-xs text-gray-500">{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Quick Stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">Pending Requests</div>
          <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">Total Approved</div>
          <div className="text-2xl font-bold text-emerald-600">{formatINR(totalApproved)}</div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">All Requests</div>
          <div className="text-2xl font-bold text-blue-600">{rows.length}</div>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-white shadow-sm">
        <DataTable
          columns={columns}
          data={rows}
          loading={fetching}
          empty="No cash collection requests yet"
        />
      </div>

      {/* ── New Request Modal ─────────────────────────────────────────── */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="New Cash Collection Request"
      >
        <form onSubmit={handleSubmit} className="space-y-5 p-1">
          {/* Step 1 — Select bank account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Company Bank Account <span className="text-red-500">*</span>
            </label>
            {bankAccounts.length === 0 ? (
              <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                No active bank accounts available. Please contact your admin.
              </div>
            ) : (
              <div className="grid gap-2">
                {bankAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setSelectedBank(acc)}
                    className={`w-full text-left rounded-lg border p-3 transition-all ${
                      selectedBank?.id === acc.id
                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                        : "border-gray-200 hover:border-blue-300 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-sm">{acc.bankName}</div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {acc.accountName} &bull; A/C: {acc.accountNumber}
                        </div>
                        <div className="text-xs text-gray-500">IFSC: {acc.ifscCode}</div>
                        {acc.upiId && (
                          <div className="text-xs text-violet-600 mt-0.5">UPI: {acc.upiId}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">
                          Charge:{" "}
                          <span className="font-medium text-orange-600">
                            {acc.chargeType === "FLAT"
                              ? `₹${acc.chargeValue}`
                              : `${acc.chargeValue}%`}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1 justify-end">
                          {acc.acceptedModes.map((m) => (
                            <span
                              key={m}
                              className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                            >
                              {MODE_LABELS[m]}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedBank && (
            <>
              {/* Step 2 — Payment mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Mode <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedBank.acceptedModes.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        mode === m
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-700 border-gray-200 hover:border-blue-400"
                      }`}
                    >
                      {MODE_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3 — Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  placeholder="Enter amount"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {preview && (
                  <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gross Amount</span>
                      <span className="font-medium">{formatINR(parsedAmount)}</span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>Platform Charge ({selectedBank.chargeType === "FLAT" ? `₹${selectedBank.chargeValue} flat` : `${selectedBank.chargeValue}%`})</span>
                      <span>− {formatINR(preview.charge)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-semibold border-t border-amber-200 pt-1 mt-1">
                      <span>Net Credit to Wallet</span>
                      <span>{formatINR(preview.net)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 4 — Target Wallet */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Credit to Wallet
                </label>
                <div className="flex gap-2">
                  {(["PRIMARY", "DMT", "AEPS"] as const).map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setTargetWallet(w)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                        targetWallet === w
                          ? w === "PRIMARY"
                            ? "bg-blue-600 text-white border-blue-600"
                            : w === "DMT"
                            ? "bg-violet-600 text-white border-violet-600"
                            : "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {WALLET_LABELS[w]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 5 — Reference / UTR */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  UTR / Reference Number
                  {(mode === "NEFT" || mode === "RTGS") && (
                    <span className="text-red-500"> *</span>
                  )}
                </label>
                <input
                  type="text"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                  required={mode === "NEFT" || mode === "RTGS"}
                  placeholder="Bank transaction reference"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Step 6 — Payment Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Step 7 — Slip upload URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Slip / Screenshot URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={slipUrl}
                    onChange={(e) => setSlipUrl(e.target.value)}
                    placeholder="https://… (upload to cloud and paste link)"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100 text-sm"
                    title="Upload slip (paste URL)"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Upload your payment slip to any image host and paste the link here.
                </p>
              </div>

              {/* Step 8 — Remarks */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remarks (optional)
                </label>
                <textarea
                  value={userRemarks}
                  onChange={(e) => setUserRemarks(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Any additional notes…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !selectedBank}>
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
              ) : (
                "Submit Request"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── View Detail Modal ─────────────────────────────────────────── */}
      {selectedRow && (
        <Modal
          open={!!selectedRow}
          onClose={() => setSelectedRow(null)}
          title="Cash Collection Details"
        >
          <div className="space-y-3 text-sm p-1">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Status</span>
              <Badge variant={STATUS_BADGE[selectedRow.status]}>{selectedRow.status}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Bank</span>
              <span className="font-medium">{selectedRow.companyBankAccount.bankName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Account</span>
              <span className="font-mono text-xs">{selectedRow.companyBankAccount.accountNumber}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Mode</span>
              <span className="font-medium">{MODE_LABELS[selectedRow.mode]}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Amount</span>
              <span className="font-semibold">{formatINR(selectedRow.amount)}</span>
            </div>
            {selectedRow.chargeAmount != null && (
              <>
                <div className="flex items-center justify-between text-orange-600">
                  <span>Platform Charge</span>
                  <span>− {formatINR(selectedRow.chargeAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-emerald-700 font-semibold border-t pt-2">
                  <span>Net Credited</span>
                  <span>{formatINR(selectedRow.netAmount ?? selectedRow.amount)}</span>
                </div>
              </>
            )}
            {selectedRow.targetWallet && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Wallet</span>
                <span className={`font-medium ${WALLET_COLORS[selectedRow.targetWallet]}`}>
                  {WALLET_LABELS[selectedRow.targetWallet]}
                </span>
              </div>
            )}
            {selectedRow.utr && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500">UTR</span>
                <span className="font-mono text-xs">{selectedRow.utr}</span>
              </div>
            )}
            {selectedRow.slipUrl && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Slip</span>
                <a
                  href={selectedRow.slipUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-xs"
                >
                  View Slip ↗
                </a>
              </div>
            )}
            {selectedRow.adminRemarks && (
              <div className="rounded-lg bg-gray-50 p-3 mt-2">
                <div className="text-xs text-gray-500 font-medium mb-1">Admin Remarks</div>
                <div className="text-sm text-gray-700">{selectedRow.adminRemarks}</div>
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t">
              <span>Submitted</span>
              <span>{new Date(selectedRow.createdAt).toLocaleString("en-IN")}</span>
            </div>
            {selectedRow.approvedAt && (
              <div className="flex items-center justify-between text-xs text-emerald-600">
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</span>
                <span>{new Date(selectedRow.approvedAt).toLocaleString("en-IN")}</span>
              </div>
            )}
            {selectedRow.rejectedAt && (
              <div className="flex items-center justify-between text-xs text-red-500">
                <span className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</span>
                <span>{new Date(selectedRow.rejectedAt).toLocaleString("en-IN")}</span>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Empty state */}
      {!fetching && rows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Clock className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No requests yet</h3>
          <p className="text-gray-500 text-sm mb-4">
            Submit a cash collection request to deposit funds to your wallet.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Request
          </Button>
        </div>
      )}
    </div>
  );
}
