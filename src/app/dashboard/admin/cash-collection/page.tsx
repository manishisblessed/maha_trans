"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  Loader2,
  Building2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatINR } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type BankAccount = {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string | null;
  upiId: string | null;
  acceptedModes: string[];
  chargeType: "FLAT" | "PERCENT";
  chargeValue: number;
  chargeGstInclusive: boolean;
  defaultTargetWallet: "PRIMARY" | "DMT" | "AEPS";
  isActive: boolean;
  sortOrder: number;
  notes: string | null;
  createdAt: string;
  createdBy: { id: string; name: string; email: string } | null;
};

type Collection = {
  id: string;
  mode: string;
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
  requester: { id: string; name: string; email: string; phone: string };
  approver: { id: string; name: string; email: string } | null;
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
  PRIMARY: "text-blue-600 bg-blue-50",
  DMT: "text-violet-600 bg-violet-50",
  AEPS: "text-emerald-600 bg-emerald-50",
};

const STATUS_BADGE: Record<string, "success" | "danger" | "warning"> = {
  APPROVED: "success",
  REJECTED: "danger",
  PENDING: "warning",
  CANCELLED: "danger",
};

// ─── Bank Account Form ────────────────────────────────────────────────────────

const EMPTY_BANK = {
  accountName: "",
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  branch: "",
  upiId: "",
  acceptedModes: ["NEFT", "RTGS", "UPI", "CASH_DEPOSIT"] as string[],
  chargeType: "FLAT" as "FLAT" | "PERCENT",
  chargeValue: 0,
  chargeGstInclusive: false,
  defaultTargetWallet: "PRIMARY" as "PRIMARY" | "DMT" | "AEPS",
  isActive: true,
  sortOrder: 0,
  notes: "",
};

function BankAccountForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<typeof EMPTY_BANK>;
  onSave: (data: typeof EMPTY_BANK) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_BANK, ...initial });
  const [saving, setSaving] = useState(false);

  const toggleMode = (m: string) => {
    setForm((f) => ({
      ...f,
      acceptedModes: f.acceptedModes.includes(m)
        ? f.acceptedModes.filter((x) => x !== m)
        : [...f.acceptedModes, m],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.acceptedModes.length === 0) {
      toast.error("Select at least one payment mode");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-1">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Name <span className="text-red-500">*</span>
          </label>
          <input
            required
            value={form.accountName}
            onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
            placeholder="Transpe Payments Pvt Ltd"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bank Name <span className="text-red-500">*</span>
          </label>
          <input
            required
            value={form.bankName}
            onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
            placeholder="HDFC Bank"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Number <span className="text-red-500">*</span>
          </label>
          <input
            required
            value={form.accountNumber}
            onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
            placeholder="00001234567890"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            IFSC Code <span className="text-red-500">*</span>
          </label>
          <input
            required
            value={form.ifscCode}
            onChange={(e) => setForm((f) => ({ ...f, ifscCode: e.target.value.toUpperCase() }))}
            placeholder="HDFC0001234"
            pattern="[A-Z]{4}0[A-Z0-9]{6}"
            title="Valid IFSC: 4 letters + 0 + 6 alphanumeric"
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
          <input
            value={form.branch}
            onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))}
            placeholder="Main Branch, Mumbai"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
          <input
            value={form.upiId}
            onChange={(e) => setForm((f) => ({ ...f, upiId: e.target.value }))}
            placeholder="transpe@hdfcbank"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Accepted modes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Accepted Payment Modes <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {["NEFT", "RTGS", "UPI", "CASH_DEPOSIT"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => toggleMode(m)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                form.acceptedModes.includes(m)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
              }`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Charge config */}
      <div className="rounded-lg border bg-orange-50 border-orange-100 p-4 space-y-3">
        <div className="text-sm font-semibold text-orange-700">Platform Charge Configuration</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Charge Type</label>
            <select
              value={form.chargeType}
              onChange={(e) => setForm((f) => ({ ...f, chargeType: e.target.value as "FLAT" | "PERCENT" }))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="FLAT">Flat ₹</option>
              <option value="PERCENT">Percent %</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Charge Value {form.chargeType === "FLAT" ? "(₹)" : "(%)"}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.chargeValue}
              onChange={(e) => setForm((f) => ({ ...f, chargeValue: parseFloat(e.target.value) || 0 }))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={form.chargeGstInclusive}
            onChange={(e) => setForm((f) => ({ ...f, chargeGstInclusive: e.target.checked }))}
            className="w-4 h-4 rounded"
          />
          <span className="text-gray-700">Charge value is GST-inclusive (18%)</span>
        </label>
      </div>

      {/* Default wallet */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Default Target Wallet
        </label>
        <div className="flex gap-2">
          {(["PRIMARY", "DMT", "AEPS"] as const).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setForm((f) => ({ ...f, defaultTargetWallet: w }))}
              className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                form.defaultTargetWallet === w
                  ? `${WALLET_COLORS[w]} border-current`
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              }`}
            >
              {WALLET_LABELS[w]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
          <input
            type="number"
            min="0"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="w-4 h-4 rounded"
            />
            <span className="font-medium">Active</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={2}
          placeholder="Internal notes (not visible to users)"
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : "Save Account"}
        </Button>
      </div>
    </form>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

export default function AdminCashCollectionPage() {
  const [activeTab, setActiveTab] = useState<"requests" | "accounts">("requests");

  // ── Collections state ───────────────────────────────────────────────────
  const [rows, setRows] = useState<Collection[]>([]);
  const [fetchingRows, setFetchingRows] = useState(true);
  const [selectedRow, setSelectedRow] = useState<Collection | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [approveModal, setApproveModal] = useState<Collection | null>(null);
  const [rejectModal, setRejectModal] = useState<Collection | null>(null);
  // Override fields in approve modal
  const [overrideCharge, setOverrideCharge] = useState(false);
  const [overrideChargeType, setOverrideChargeType] = useState<"FLAT" | "PERCENT">("FLAT");
  const [overrideChargeValue, setOverrideChargeValue] = useState(0);
  const [overrideWallet, setOverrideWallet] = useState<"PRIMARY" | "DMT" | "AEPS">("PRIMARY");
  const [approveRemarks, setApproveRemarks] = useState("");
  const [rejectRemarks, setRejectRemarks] = useState("");

  // ── Bank accounts state ─────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [fetchingAccounts, setFetchingAccounts] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<BankAccount | null>(null);

  const fetchRows = useCallback(async () => {
    try {
      setFetchingRows(true);
      const res = await fetch("/api/cash-collection");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setRows(json.collections);
    } catch {
      toast.error("Could not load cash collection requests");
    } finally {
      setFetchingRows(false);
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      setFetchingAccounts(true);
      const res = await fetch("/api/admin/cash-collection/bank-accounts");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setAccounts(json.accounts);
    } catch {
      toast.error("Could not load bank accounts");
    } finally {
      setFetchingAccounts(false);
    }
  }, []);

  useEffect(() => { void fetchRows(); }, [fetchRows]);
  useEffect(() => { if (activeTab === "accounts") void fetchAccounts(); }, [activeTab, fetchAccounts]);

  // ── Approve ─────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!approveModal) return;
    setProcessing(approveModal.id);
    try {
      const body: Record<string, unknown> = { action: "approve", remarks: approveRemarks || undefined };
      if (overrideCharge) {
        body.chargeType = overrideChargeType;
        body.chargeValue = overrideChargeValue;
      }
      body.targetWallet = overrideWallet;

      const res = await fetch(`/api/cash-collection/${approveModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Approval failed");
      toast.success(`Approved! Net credited: ${formatINR(json.netAmount)}`);
      setApproveModal(null);
      setApproveRemarks("");
      setOverrideCharge(false);
      await fetchRows();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setProcessing(null);
    }
  };

  // ── Reject ──────────────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!rejectModal) return;
    setProcessing(rejectModal.id);
    try {
      const res = await fetch(`/api/cash-collection/${rejectModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", remarks: rejectRemarks || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Rejection failed");
      toast.success("Request rejected");
      setRejectModal(null);
      setRejectRemarks("");
      await fetchRows();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rejection failed");
    } finally {
      setProcessing(null);
    }
  };

  // ── Save bank account ────────────────────────────────────────────────────
  const handleSaveBankAccount = async (data: typeof EMPTY_BANK) => {
    try {
      const url = editingAccount
        ? `/api/admin/cash-collection/bank-accounts/${editingAccount.id}`
        : "/api/admin/cash-collection/bank-accounts";
      const method = editingAccount ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          branch: data.branch || undefined,
          upiId: data.upiId || undefined,
          notes: data.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(json.error));
      toast.success(editingAccount ? "Bank account updated" : "Bank account added");
      setShowBankForm(false);
      setEditingAccount(null);
      await fetchAccounts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
      throw err;
    }
  };

  // ── Delete bank account ──────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (!deletingAccount) return;
    try {
      const res = await fetch(`/api/admin/cash-collection/bank-accounts/${deletingAccount.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      if (json.deactivated) {
        toast.info("Account has existing transactions — marked as inactive instead of deleted");
      } else {
        toast.success("Bank account deleted");
      }
      setDeletingAccount(null);
      await fetchAccounts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  // ── Toggle active ────────────────────────────────────────────────────────
  const handleToggleActive = async (acc: BankAccount) => {
    try {
      const res = await fetch(`/api/admin/cash-collection/bank-accounts/${acc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !acc.isActive }),
      });
      if (!res.ok) throw new Error();
      toast.success(acc.isActive ? "Account deactivated" : "Account activated");
      await fetchAccounts();
    } catch {
      toast.error("Failed to toggle status");
    }
  };

  // ── Counts ───────────────────────────────────────────────────────────────
  const pendingRows = rows.filter((r) => r.status === "PENDING");

  // ── Collection table columns ─────────────────────────────────────────────
  const collectionCols: Column<Collection>[] = [
    {
      key: "createdAt",
      header: "Date",
      render: (r) =>
        new Date(r.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    },
    {
      key: "requester",
      header: "User",
      render: (r) => (
        <div>
          <div className="font-medium text-sm">{r.requester.name}</div>
          <div className="text-xs text-gray-500">{r.requester.phone}</div>
        </div>
      ),
    },
    {
      key: "companyBankAccount",
      header: "Bank",
      render: (r) => (
        <div className="text-sm">{r.companyBankAccount.bankName}</div>
      ),
    },
    {
      key: "mode",
      header: "Mode",
      render: (r) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          {MODE_LABELS[r.mode] ?? r.mode}
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
            <div className="text-xs text-emerald-600">Net: {formatINR(r.netAmount)}</div>
          )}
        </div>
      ),
    },
    {
      key: "utr",
      header: "UTR",
      render: (r) => <span className="text-xs font-mono">{r.utr ?? "—"}</span>,
    },
    {
      key: "slipUrl",
      header: "Slip",
      render: (r) =>
        r.slipUrl ? (
          <a href={r.slipUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
            View ↗
          </a>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <Badge variant={STATUS_BADGE[r.status]}>{r.status}</Badge>,
    },
    {
      key: "id",
      header: "Actions",
      render: (r) => (
        <div className="flex gap-1.5">
          <button onClick={() => setSelectedRow(r)} className="text-xs text-blue-600 hover:underline">
            View
          </button>
          {r.status === "PENDING" && (
            <>
              <button
                onClick={() => {
                  setApproveModal(r);
                  setOverrideWallet(r.targetWallet ?? "PRIMARY");
                }}
                disabled={processing === r.id}
                className="text-xs text-emerald-600 hover:underline font-medium"
              >
                Approve
              </button>
              <button
                onClick={() => setRejectModal(r)}
                disabled={processing === r.id}
                className="text-xs text-red-500 hover:underline"
              >
                Reject
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  // ── Bank account table columns ───────────────────────────────────────────
  const accountCols: Column<BankAccount>[] = [
    {
      key: "bankName",
      header: "Bank",
      render: (a) => (
        <div>
          <div className="font-medium">{a.bankName}</div>
          <div className="text-xs text-gray-500">{a.accountName}</div>
        </div>
      ),
    },
    {
      key: "accountNumber",
      header: "A/C Number",
      render: (a) => <span className="font-mono text-sm">···{a.accountNumber.slice(-4)}</span>,
    },
    {
      key: "ifscCode",
      header: "IFSC",
      render: (a) => <span className="font-mono text-xs">{a.ifscCode}</span>,
    },
    {
      key: "acceptedModes",
      header: "Modes",
      render: (a) => (
        <div className="flex flex-wrap gap-1">
          {a.acceptedModes.map((m) => (
            <span key={m} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
              {MODE_LABELS[m] ?? m}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "chargeValue",
      header: "Charge",
      render: (a) => (
        <span className="text-sm font-medium text-orange-600">
          {a.chargeType === "FLAT" ? `₹${a.chargeValue}` : `${a.chargeValue}%`}
        </span>
      ),
    },
    {
      key: "defaultTargetWallet",
      header: "Default Wallet",
      render: (a) => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${WALLET_COLORS[a.defaultTargetWallet]}`}>
          {WALLET_LABELS[a.defaultTargetWallet]}
        </span>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      render: (a) => (
        <button onClick={() => handleToggleActive(a)} className="flex items-center gap-1">
          {a.isActive ? (
            <ToggleRight className="w-5 h-5 text-emerald-500" />
          ) : (
            <ToggleLeft className="w-5 h-5 text-gray-400" />
          )}
          <span className={`text-xs ${a.isActive ? "text-emerald-600" : "text-gray-400"}`}>
            {a.isActive ? "Active" : "Inactive"}
          </span>
        </button>
      ),
    },
    {
      key: "id",
      header: "Actions",
      render: (a) => (
        <div className="flex gap-2">
          <button
            onClick={() => { setEditingAccount(a); setShowBankForm(true); }}
            className="text-gray-500 hover:text-blue-600 transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeletingAccount(a)}
            className="text-gray-500 hover:text-red-500 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash Collection Management"
        description="Manage company bank accounts and approve deposit requests"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => (activeTab === "requests" ? fetchRows() : fetchAccounts())}
            disabled={fetchingRows || fetchingAccounts}
          >
            <RefreshCw className={`w-4 h-4 ${fetchingRows || fetchingAccounts ? "animate-spin" : ""}`} />
          </Button>
        }
      />

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(["requests", "accounts"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-white shadow text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "requests" ? (
              <>Deposit Requests {pendingRows.length > 0 && <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs bg-amber-500 text-white rounded-full">{pendingRows.length}</span>}</>
            ) : (
              <><Building2 className="w-4 h-4 inline mr-1" /> Bank Accounts</>
            )}
          </button>
        ))}
      </div>

      {/* ── Requests Tab ─────────────────────────────────────────────── */}
      {activeTab === "requests" && (
        <div className="rounded-xl border bg-white shadow-sm">
            <DataTable
              columns={collectionCols}
              data={rows}
              loading={fetchingRows}
              empty="No cash collection requests"
            />
          </div>
      )}

      {/* ── Bank Accounts Tab ─────────────────────────────────────────── */}
      {activeTab === "accounts" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => { setEditingAccount(null); setShowBankForm(true); }}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Bank Account
            </Button>
          </div>
          <div className="rounded-xl border bg-white shadow-sm">
            <DataTable
              columns={accountCols}
              data={accounts}
              loading={fetchingAccounts}
              empty="No bank accounts configured"
            />
          </div>
        </div>
      )}

      {/* ── Approve Modal ─────────────────────────────────────────────── */}
      {approveModal && (
        <Modal open={!!approveModal} onClose={() => setApproveModal(null)} title="Approve Cash Collection">
          <div className="space-y-4 p-1">
            {/* Summary */}
            <div className="rounded-lg bg-gray-50 border p-3 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">User</span>
                <span className="font-medium">{approveModal.requester.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Mode</span>
                <span>{MODE_LABELS[approveModal.mode] ?? approveModal.mode}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-gray-500">Amount</span>
                <span>{formatINR(approveModal.amount)}</span>
              </div>
              {approveModal.utr && (
                <div className="flex justify-between">
                  <span className="text-gray-500">UTR</span>
                  <span className="font-mono text-xs">{approveModal.utr}</span>
                </div>
              )}
              {approveModal.slipUrl && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Slip</span>
                  <a href={approveModal.slipUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
                    View ↗
                  </a>
                </div>
              )}
            </div>

            {/* Target wallet */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Credit to Wallet</label>
              <div className="flex gap-2">
                {(["PRIMARY", "DMT", "AEPS"] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setOverrideWallet(w)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                      overrideWallet === w
                        ? `${WALLET_COLORS[w]} border-current`
                        : "bg-white text-gray-600 border-gray-200"
                    }`}
                  >
                    {WALLET_LABELS[w]}
                  </button>
                ))}
              </div>
            </div>

            {/* Override charge */}
            <div>
              <label className="flex items-center gap-2 text-sm cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={overrideCharge}
                  onChange={(e) => setOverrideCharge(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="font-medium">Override platform charge</span>
              </label>
              {overrideCharge && (
                <div className="flex gap-3 mt-2">
                  <select
                    value={overrideChargeType}
                    onChange={(e) => setOverrideChargeType(e.target.value as "FLAT" | "PERCENT")}
                    className="border rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="FLAT">Flat ₹</option>
                    <option value="PERCENT">Percent %</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={overrideChargeValue}
                    onChange={(e) => setOverrideChargeValue(parseFloat(e.target.value) || 0)}
                    className="border rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Value"
                  />
                </div>
              )}
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (optional)</label>
              <textarea
                value={approveRemarks}
                onChange={(e) => setApproveRemarks(e.target.value)}
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setApproveModal(null)}>Cancel</Button>
              <Button
                onClick={handleApprove}
                disabled={processing === approveModal.id}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {processing === approveModal.id ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Approving…</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 mr-2" /> Confirm Approval</>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Reject Modal ──────────────────────────────────────────────── */}
      {rejectModal && (
        <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Cash Collection">
          <div className="space-y-4 p-1">
            <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-gray-500">User</span>
                <span className="font-medium">{rejectModal.requester.name}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-gray-500">Amount</span>
                <span>{formatINR(rejectModal.amount)}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Rejection</label>
              <textarea
                value={rejectRemarks}
                onChange={(e) => setRejectRemarks(e.target.value)}
                rows={3}
                placeholder="Explain why this request is rejected…"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setRejectModal(null)}>Cancel</Button>
              <Button
                onClick={handleReject}
                disabled={processing === rejectModal.id}
                className="bg-red-600 hover:bg-red-700"
              >
                {processing === rejectModal.id ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Rejecting…</>
                ) : (
                  <><XCircle className="w-4 h-4 mr-2" /> Confirm Rejection</>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Bank Account Form Modal ───────────────────────────────────── */}
      {showBankForm && (
        <Modal
          open={showBankForm}
          onClose={() => { setShowBankForm(false); setEditingAccount(null); }}
          title={editingAccount ? "Edit Bank Account" : "Add Bank Account"}
        >
          <BankAccountForm
            initial={
            editingAccount
              ? {
                  ...editingAccount,
                  branch: editingAccount.branch ?? "",
                  upiId: editingAccount.upiId ?? "",
                  notes: editingAccount.notes ?? "",
                }
              : undefined
          }
            onSave={handleSaveBankAccount}
            onCancel={() => { setShowBankForm(false); setEditingAccount(null); }}
          />
        </Modal>
      )}

      {/* ── Delete confirm ─────────────────────────────────────────────── */}
      {deletingAccount && (
        <ConfirmDialog
          open={!!deletingAccount}
          title="Remove Bank Account"
          description={`Are you sure you want to remove "${deletingAccount.bankName}" (···${deletingAccount.accountNumber.slice(-4)})? If it has existing requests, it will be deactivated instead.`}
          confirmLabel="Remove"
          tone="danger"
          onConfirm={() => handleDeleteAccount()}
          onClose={() => setDeletingAccount(null)}
        />
      )}

      {/* ── Detail View Modal ─────────────────────────────────────────── */}
      {selectedRow && (
        <Modal open={!!selectedRow} onClose={() => setSelectedRow(null)} title="Request Details">
          <div className="space-y-3 text-sm p-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <Badge variant={STATUS_BADGE[selectedRow.status]}>{selectedRow.status}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">User</span>
              <div className="text-right">
                <div className="font-medium">{selectedRow.requester.name}</div>
                <div className="text-xs text-gray-500">{selectedRow.requester.phone}</div>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Bank</span>
              <span>{selectedRow.companyBankAccount.bankName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Mode</span>
              <span>{MODE_LABELS[selectedRow.mode] ?? selectedRow.mode}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-gray-500">Amount</span>
              <span>{formatINR(selectedRow.amount)}</span>
            </div>
            {selectedRow.chargeAmount != null && (
              <>
                <div className="flex justify-between text-orange-600">
                  <span>Charge</span>
                  <span>− {formatINR(selectedRow.chargeAmount)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold border-t pt-2">
                  <span>Net Credited</span>
                  <span>{formatINR(selectedRow.netAmount ?? selectedRow.amount)}</span>
                </div>
              </>
            )}
            {selectedRow.targetWallet && (
              <div className="flex justify-between">
                <span className="text-gray-500">Wallet</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${WALLET_COLORS[selectedRow.targetWallet]}`}>
                  {WALLET_LABELS[selectedRow.targetWallet]}
                </span>
              </div>
            )}
            {selectedRow.utr && (
              <div className="flex justify-between">
                <span className="text-gray-500">UTR</span>
                <span className="font-mono text-xs">{selectedRow.utr}</span>
              </div>
            )}
            {selectedRow.userRemarks && (
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="text-xs font-medium text-gray-500 mb-1">User Remarks</div>
                <div>{selectedRow.userRemarks}</div>
              </div>
            )}
            {selectedRow.adminRemarks && (
              <div className="rounded-lg bg-amber-50 p-3">
                <div className="text-xs font-medium text-gray-500 mb-1">Admin Remarks</div>
                <div>{selectedRow.adminRemarks}</div>
              </div>
            )}
            {selectedRow.slipUrl && (
              <a href={selectedRow.slipUrl} target="_blank" rel="noopener noreferrer" className="block text-center text-blue-600 hover:underline text-sm py-2 border rounded-lg mt-2">
                View Payment Slip ↗
              </a>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
