"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatBDT } from "@/lib/utils";
import {
  Receipt,
  Plus,
  ShoppingBag,
  Calendar,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Scale,
  Coins,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

export default function ExpensesPage() {
  const { currentMessId, currentResidency, user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7));
  const todayStr = new Date().toISOString().split("T")[0];

  const [expenses, setExpenses] = useState<any[]>([]);
  const [totalExpense, setTotalExpense] = useState(0);

  // Smart Debt Settlement State
  const [settlements, setSettlements] = useState<any>(null);
  const [settlementLoading, setSettlementLoading] = useState(false);

  // Bazar Roster State
  const [bazarSchedules, setBazarSchedules] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [assignModal, setAssignModal] = useState(false);
  const [assignDate, setAssignDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [assignResidencyId, setAssignResidencyId] = useState("");
  const [assignNotes, setAssignNotes] = useState("");

  // Daily Bazar Form State
  const [bazarDate, setBazarDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [bazarAmount, setBazarAmount] = useState("");
  const [bazarDesc, setBazarDesc] = useState("");
  const [bazarReceiptUrl, setBazarReceiptUrl] = useState("");

  // AI Scan Receipt State (#42)
  const [scanModal, setScanModal] = useState(false);
  const [scanReceiptText, setScanReceiptText] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<any>(null);

  const handleScanReceipt = async () => {
    if (!currentMessId) return;
    setScanning(true);
    try {
      const res = await api.scanReceipt(currentMessId, {
        raw_text: scanReceiptText || undefined,
      });
      setScannedResult(res);
    } catch (err: any) {
      alert(err.message || "Failed to scan receipt");
    } finally {
      setScanning(false);
    }
  };

  const handleApplyScannedToBazar = () => {
    if (!scannedResult) return;
    setBazarAmount(String(scannedResult.total_amount || ""));
    const desc = scannedResult.items
      ?.map((i: any) => `${i.item_name} (${i.quantity || ""}) - ৳${i.amount}`)
      .join(", ");
    setBazarDesc(desc || "Market grocery items");
    setScanModal(false);
  };

  // Fixed Bill Form State
  const [fixedTitle, setFixedTitle] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [fixedSplitMethod, setFixedSplitMethod] = useState<"equal" | "prorated">("equal");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isManager = currentResidency?.role === "owner" || currentResidency?.role === "manager";

  // Check if current user has duty today
  const hasDutyToday = bazarSchedules.some(
    (s) =>
      s.date?.startsWith(todayStr) &&
      (s.assigned_residency_id === currentResidency?.id ||
        s.assigned_residency?.user_id === user?.id ||
        s.assigned_residency?.user?.id === user?.id)
  );

  const canLogBazar = isManager || hasDutyToday;

  useEffect(() => {
    if (currentMessId) {
      loadExpenses();
      loadBazarSchedules();
      loadSettlements();
      if (isManager) {
        loadResidents();
      }
    }
  }, [currentMessId, selectedMonth]);

  const loadExpenses = async () => {
    try {
      if (!currentMessId) return;
      const res = await api.getExpenses(currentMessId, selectedMonth);
      setExpenses(res.expenses || []);
      setTotalExpense(res.total || 0);
    } catch {
      // ignore
    }
  };

  const loadSettlements = async () => {
    try {
      if (!currentMessId) return;
      setSettlementLoading(true);
      const res = await api.getSettlements(currentMessId, selectedMonth);
      setSettlements(res);
    } catch {
      // ignore
    } finally {
      setSettlementLoading(false);
    }
  };

  const loadBazarSchedules = async () => {
    try {
      if (!currentMessId) return;
      const res = await api.getBazarSchedules(currentMessId, selectedMonth);
      setBazarSchedules(res.schedules || []);
    } catch {
      // ignore
    }
  };

  const loadResidents = async () => {
    try {
      if (!currentMessId) return;
      const res = await api.getResidents(currentMessId);
      const activeOnly = (res.residents || []).filter((r: any) => r.status === "active");
      setResidents(activeOnly);
      if (activeOnly.length > 0 && !assignResidencyId) {
        setAssignResidencyId(activeOnly[0].id);
      }
    } catch {
      // ignore
    }
  };

  const handleAddBazar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessId) return;
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      await api.logExpense(currentMessId, {
        date: bazarDate,
        amount: parseFloat(bazarAmount),
        description: bazarDesc,
        receipt_photo_url: bazarReceiptUrl || null,
      });

      setMessage("Bazar expense recorded successfully! Live meal rate recalculated.");
      setBazarAmount("");
      setBazarDesc("");
      setBazarReceiptUrl("");
      loadExpenses();
      loadBazarSchedules();
      loadSettlements();
    } catch (err: any) {
      setError(err.message || "Failed to log expense.");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignBazar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessId) return;
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      await api.assignBazarSchedule(currentMessId, {
        residency_id: assignResidencyId,
        date: assignDate,
        notes: assignNotes || null,
      });

      setMessage("Bazar duty assigned successfully!");
      setAssignNotes("");
      setAssignModal(false);
      loadBazarSchedules();
    } catch (err: any) {
      setError(err.message || "Failed to assign duty schedule.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm("Are you sure you want to remove this bazar duty assignment?")) return;
    setError(null);
    try {
      await api.deleteBazarSchedule(scheduleId);
      setMessage("Bazar duty schedule removed.");
      loadBazarSchedules();
    } catch (err: any) {
      setError(err.message || "Failed to delete schedule.");
    }
  };

  const handleAddFixedBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessId) return;
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      await api.addFixedBill(currentMessId, {
        title: fixedTitle,
        amount: parseFloat(fixedAmount),
        billing_month: selectedMonth,
        split_method: fixedSplitMethod,
      });

      setMessage("Fixed shared bill added for " + selectedMonth + "!");
      setFixedTitle("");
      setFixedAmount("");
      loadSettlements();
    } catch (err: any) {
      setError(err.message || "Failed to add fixed bill.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bazar Roster, Ledger & Shared Costs</h1>
          <p className="text-sm text-gray-500">
            Assign bazar duties, log market expenses, and manage monthly shared bills.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Month:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {message && (
        <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 border border-emerald-200">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {/* Duty Notification Banner for resident */}
      {hasDutyToday && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl shrink-0">
              🛒
            </div>
            <div>
              <h3 className="font-extrabold text-base">You have Bazar Duty Today! (আজ আপনার বাজার দায়িত্ব)</h3>
              <p className="text-xs text-emerald-100 mt-0.5">
                You are authorized to purchase mess groceries today and record the bill below.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white text-emerald-800 shrink-0">
            Duty Authorized
          </span>
        </div>
      )}

      {/* Bazar Duty Roster Table & Manager Assign */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-gray-900">
                Bazar Duty Roster for {selectedMonth} (বাজারের দায়িত্বের তালিকা)
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Only assigned residents (or managers) can log daily grocery expenses on their duty date.
            </p>
          </div>

          {isManager && (
            <button
              onClick={() => setAssignModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
            >
              <Plus className="h-4 w-4" /> Assign Bazar Duty
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Assigned Resident</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4">Status</th>
                {isManager && <th className="py-3 px-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bazarSchedules.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 6 : 5} className="py-8 text-center text-gray-400">
                    No bazar duty scheduled for this month.
                  </td>
                </tr>
              ) : (
                bazarSchedules.map((schedule: any) => {
                  const isToday = schedule.date?.startsWith(todayStr);
                  return (
                    <tr
                      key={schedule.id}
                      className={`hover:bg-gray-50/80 transition ${
                        isToday ? "bg-emerald-50/40 font-medium" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">
                            {new Date(schedule.date).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          {isToday && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
                              TODAY
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900">
                          {schedule.assigned_residency?.user?.name || "Resident"}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {schedule.assigned_residency?.user?.phone || "—"}
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-xs">{schedule.notes || "—"}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                            schedule.status === "completed"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-amber-100 text-amber-800 border border-amber-300"
                          }`}
                        >
                          {schedule.status}
                        </span>
                      </td>
                      {isManager && (
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="text-gray-400 hover:text-red-600 p-1 transition"
                            title="Delete assignment"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Forms Grid: Daily Bazar Expense & Fixed Bills */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Log Daily Bazar Expense */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-emerald-600" /> Log Daily Market / Bazar
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScanModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-lg border border-purple-200 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                AI Scan Memo
              </button>
              {canLogBazar ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Authorized
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                  Restricted
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-500">
            This amount updates the daily per-meal rate and is split across today's active meals.
          </p>

          {canLogBazar ? (
            <form onSubmit={handleAddBazar} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    required
                    value={bazarDate}
                    onChange={(e) => setBazarDate(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Amount (BDT)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={bazarAmount}
                    onChange={(e) => setBazarAmount(e.target.value)}
                    placeholder="e.g. 650"
                    className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Items / Description</label>
                <input
                  type="text"
                  required
                  value={bazarDesc}
                  onChange={(e) => setBazarDesc(e.target.value)}
                  placeholder="Fish, rice, vegetables, spices..."
                  className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Receipt Photo URL (Optional)</label>
                <input
                  type="url"
                  value={bazarReceiptUrl}
                  onChange={(e) => setBazarReceiptUrl(e.target.value)}
                  placeholder="https://... receipt image link"
                  className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                {loading ? "Recording..." : "Record Bazar Entry"}
              </button>
            </form>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-6 text-center space-y-2">
              <AlertCircle className="h-8 w-8 text-gray-400 mx-auto" />
              <div className="text-sm font-semibold text-gray-800">Bazar Logging Locked</div>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Only the Mess Manager or the resident assigned for today's bazar duty in the roster can log
                market purchases.
              </p>
            </div>
          )}
        </div>

        {/* Add Fixed Shared Bill (Manager Only) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" /> Add Fixed Shared Bill
            </h2>
            {isManager && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                <ShieldCheck className="h-3.5 w-3.5" /> Manager Only
              </span>
            )}
          </div>

          <p className="text-xs text-gray-500">
            Shared monthly utility bills (Cook, WiFi, Electricity, Waste) split among all residents.
          </p>

          {isManager ? (
            <form onSubmit={handleAddFixedBill} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Bill Title</label>
                  <input
                    type="text"
                    required
                    value={fixedTitle}
                    onChange={(e) => setFixedTitle(e.target.value)}
                    placeholder="WiFi, Electricity..."
                    className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Amount (BDT)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={fixedAmount}
                    onChange={(e) => setFixedAmount(e.target.value)}
                    placeholder="e.g. 1200"
                    className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Split Method</label>
                <select
                  value={fixedSplitMethod}
                  onChange={(e: any) => setFixedSplitMethod(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm bg-white"
                >
                  <option value="equal">Equal Split (All residents split equally)</option>
                  <option value="prorated">Prorated Split (Adjusted by days present)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {loading ? "Adding..." : "Add Shared Bill"}
              </button>
            </form>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-6 text-center space-y-2">
              <Receipt className="h-8 w-8 text-gray-400 mx-auto" />
              <div className="text-sm font-semibold text-gray-800">Manager-Only Action</div>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Only the Mess Manager can add fixed monthly utility and shared service bills.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bazar Entries Table */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Bazar Ledger for {selectedMonth}</h2>
            <p className="text-xs text-gray-500">Day-by-day grocery and market purchases</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500">Monthly Grocery Total</span>
            <div className="text-xl font-extrabold text-emerald-600">{formatBDT(totalExpense)}</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Logged By</th>
                <th className="py-3 px-4 text-right">Amount (BDT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400">
                    No bazar expenses recorded for this month.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50">
                    <td className="py-2.5 px-4 font-medium text-gray-800">
                      {new Date(exp.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="py-2.5 px-4 text-gray-700">{exp.description}</td>
                    <td className="py-2.5 px-4 text-gray-500 text-xs">
                      {exp.entered_by_user?.name || "Manager"}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-gray-900 text-right">
                      {formatBDT(exp.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Smart Debt Settlement (Splitwise Logic) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-gray-900">
                Smart Debt Settlement for {selectedMonth} (স্মার্ট ঋণ নিষ্পত্তি)
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Greedy minimum-cash-flow algorithm simplifies all member expenses & meal costs into the minimum number of direct peer-to-peer payments.
            </p>
          </div>

          {settlements && (
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  settlements.is_settled
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {settlements.is_settled ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> All Settled
                  </>
                ) : (
                  <>
                    <Coins className="h-3.5 w-3.5" /> {settlements.transfers?.length || 0} Transfers Needed
                  </>
                )}
              </span>
            </div>
          )}
        </div>

        {settlementLoading ? (
          <div className="py-8 text-center text-xs text-gray-400">
            Calculating optimal cash flow settlements...
          </div>
        ) : (
          <>
            {/* 1. Direct Peer-to-Peer Transfer Roadmap */}
            {settlements?.transfers && settlements.transfers.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Optimal Settlement Roadmap (ন্যূনতম লেনদেন পরিকল্পনা)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {settlements.transfers.map((t: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 p-4 shadow-2xs flex items-center justify-between gap-4"
                    >
                      {/* From Debtor */}
                      <div className="flex-1">
                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
                          Debtor (প্রদানকারী)
                        </span>
                        <div className="font-bold text-gray-900 text-sm mt-0.5">{t.from_user_name}</div>
                        <div className="text-[11px] text-gray-500">{t.from_user_phone || "—"}</div>
                      </div>

                      {/* Transfer Arrow & Amount */}
                      <div className="flex flex-col items-center shrink-0 px-2">
                        <span className="text-xs font-black text-emerald-700 bg-white border border-emerald-200 px-3 py-1 rounded-full shadow-2xs">
                          {formatBDT(t.amount)}
                        </span>
                        <div className="flex items-center text-emerald-600 mt-1">
                          <span className="h-0.5 w-6 bg-emerald-400"></span>
                          <ArrowRight className="h-4 w-4 -ml-1 text-emerald-600" />
                        </div>
                      </div>

                      {/* To Creditor */}
                      <div className="flex-1 text-right">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                          Creditor (প্রাপক)
                        </span>
                        <div className="font-bold text-gray-900 text-sm mt-0.5">{t.to_user_name}</div>
                        <div className="text-[11px] text-gray-500">{t.to_user_phone || "—"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-6 text-center space-y-1.5">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                <h3 className="font-bold text-emerald-900 text-sm">Everyone is Balanced & Settled!</h3>
                <p className="text-xs text-emerald-700 max-w-md mx-auto">
                  No outstanding peer-to-peer debts exist for {selectedMonth}. All expenses paid match residents&apos; meal and shared bill obligations.
                </p>
              </div>
            )}

            {/* 2. Full Member Balances Breakdown Table */}
            {settlements?.balances && settlements.balances.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Individual Member Balances (সদস্যদের হিসাব বিবরণী)
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        <th className="py-2.5 px-4">Resident</th>
                        <th className="py-2.5 px-4 text-center">Meals Eaten</th>
                        <th className="py-2.5 px-4 text-right">Total Paid</th>
                        <th className="py-2.5 px-4 text-right">Fair Share Owed</th>
                        <th className="py-2.5 px-4 text-right">Net Balance</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {settlements.balances.map((b: any) => (
                        <tr key={b.residency_id} className="hover:bg-gray-50/70 transition">
                          <td className="py-2.5 px-4">
                            <div className="font-bold text-gray-900">{b.user_name}</div>
                            <div className="text-[11px] text-gray-400">{b.user_phone || "—"}</div>
                          </td>
                          <td className="py-2.5 px-4 text-center font-medium text-gray-700">
                            {b.meals_count} meals
                          </td>
                          <td className="py-2.5 px-4 text-right text-emerald-700 font-semibold">
                            {formatBDT(b.total_paid)}
                            <div className="text-[10px] text-gray-400 font-normal">
                              (Bazar: {formatBDT(b.bazar_paid)})
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-right text-gray-700 font-semibold">
                            {formatBDT(b.total_owed)}
                            <div className="text-[10px] text-gray-400 font-normal">
                              (Meal: {formatBDT(b.meal_cost)} + Fixed: {formatBDT(b.fixed_share)})
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-right font-black text-sm">
                            <span
                              className={
                                b.net_balance > 0.01
                                  ? "text-emerald-600"
                                  : b.net_balance < -0.01
                                  ? "text-red-600"
                                  : "text-gray-500"
                              }
                            >
                              {b.net_balance > 0.01 ? `+${formatBDT(b.net_balance)}` : formatBDT(b.net_balance)}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                                b.status === "creditor"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : b.status === "debtor"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {b.status === "creditor" ? "Creditor (পাবে)" : b.status === "debtor" ? "Debtor (দিবে)" : "Settled (০)"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Assign Bazar Duty Modal (Manager Only) */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-600" /> Assign Bazar Duty
            </h3>
            <p className="text-xs text-gray-500">
              Assign a resident to handle the mess grocery shopping for a specific date.
            </p>

            <form onSubmit={handleAssignBazar} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  required
                  value={assignDate}
                  onChange={(e) => setAssignDate(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Select Resident</label>
                <select
                  required
                  value={assignResidencyId}
                  onChange={(e) => setAssignResidencyId(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm bg-white"
                >
                  {residents.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.user?.name || "Resident"} ({r.bed?.label || "Unassigned Bed"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Notes / Shopping List (Optional)</label>
                <textarea
                  rows={2}
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="e.g. 5kg rice, fresh hilsa fish, garlic, onions..."
                  className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAssignModal(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? "Assigning..." : "Confirm Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AI HANDWRITTEN RECEIPT SCANNER (#42) */}
      {scanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                  <Sparkles className="h-5 w-5" />
                </span>
                <h3 className="text-base font-bold text-gray-900">AI Handwritten Receipt / Memo Scanner</h3>
              </div>
              <button
                onClick={() => setScanModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Paste or input grocery memo line items (or use demo Bengali memo). The AI parser will detect items, quantities, and prices automatically.
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700">Memo Content / Text Lines</label>
                <button
                  type="button"
                  onClick={() =>
                    setScanReceiptText("চাল (Miniket Rice) 25kg 1750\nসয়াবিন তেল (Soybean Oil) 5L 900\nডিম (Eggs) 4 dozen 600\nমুরগি (Chicken) 2kg 440\nপেঁয়াজ ও রসুন (Onion & Garlic) 3kg 260")
                  }
                  className="text-xs text-purple-600 hover:underline font-semibold"
                >
                  Load Demo Bazar Memo
                </button>
              </div>
              <textarea
                rows={4}
                value={scanReceiptText}
                onChange={(e) => setScanReceiptText(e.target.value)}
                placeholder="চাল 10kg 650&#10;আলু 5kg 200&#10;ডিম 2 dozen 300..."
                className="w-full text-xs font-mono border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleScanReceipt}
              disabled={scanning}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {scanning ? "Scanning & Parsing Line Items..." : "Scan & Parse Items"}
            </button>

            {scannedResult && (
              <div className="bg-purple-50/60 rounded-xl p-4 border border-purple-100 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-purple-950">
                  <span>Detected Items ({scannedResult.items_detected})</span>
                  <span>Total: ৳{scannedResult.total_amount}</span>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5 text-xs text-gray-700">
                  {scannedResult.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between py-1 border-b border-purple-100/50">
                      <span>{item.item_name} <span className="text-gray-400">({item.quantity})</span></span>
                      <span className="font-semibold">৳{item.amount}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleApplyScannedToBazar}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Apply Total ৳{scannedResult.total_amount} to Bazar Entry
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
