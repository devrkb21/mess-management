"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatBDT } from "@/lib/utils";
import { FileText, Plus, CheckCircle, Clock, Printer, Users, CheckCircle2 } from "lucide-react";

export default function BillsPage() {
  const { currentMessId, currentResidency } = useAuth();
  const isManager = currentResidency?.role === "owner" || currentResidency?.role === "manager";

  const [activeTab, setActiveTab] = useState<"all" | "my">(() => (isManager ? "all" : "my"));
  const [bills, setBills] = useState<any[]>([]);
  const [allBills, setAllBills] = useState<any[]>([]);
  const [billsSummary, setBillsSummary] = useState<any>(null);

  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7));
  const [paymentModal, setPaymentModal] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [paymentNote, setPaymentNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentResidency?.id) {
      loadBills();
    }
  }, [currentResidency]);

  useEffect(() => {
    if (currentMessId && isManager) {
      loadAllBills();
    }
  }, [currentMessId, selectedMonth, isManager]);

  const loadBills = async () => {
    try {
      if (!currentResidency?.id) return;
      const res = await api.getResidentBills(currentResidency.id);
      setBills(res.bills || []);
    } catch {
      // ignore
    }
  };

  const loadAllBills = async () => {
    try {
      if (!currentMessId) return;
      const res = await api.getMessBills(currentMessId, selectedMonth);
      setAllBills(res.bills || []);
      setBillsSummary(res.summary || null);
    } catch {
      // ignore
    }
  };

  const handleGenerateBills = async () => {
    if (!currentMessId) return;
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const res = await api.generateBills(currentMessId, selectedMonth);
      setMessage(`Generated bills for ${res.bills_count} active residents for ${selectedMonth}!`);
      loadBills();
      loadAllBills();
    } catch (err: any) {
      setError(err.message || "Failed to generate monthly bills.");
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModal) return;
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      await api.recordPayment(paymentModal.id, {
        amount: parseFloat(paymentAmount),
        method: paymentMethod,
        paid_at: paymentDate,
        note: paymentNote || null,
      });

      setMessage("Payment logged successfully. Bill status updated!");
      setPaymentModal(null);
      setPaymentAmount("");
      loadBills();
      loadAllBills();
    } catch (err: any) {
      setError(err.message || "Failed to record payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monthly Invoices & Payments</h1>
          <p className="text-sm text-gray-500">
            View monthly bills broken down into meals, shared bills, and dues.
          </p>
        </div>

        {isManager && (
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"
            />
            <button
              onClick={handleGenerateBills}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
            >
              <FileText className="h-4 w-4" /> Generate Bills
            </button>
          </div>
        )}
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

      {/* Tabs for Manager */}
      {isManager && (
        <div className="flex items-center gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === "all"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Users className="h-4 w-4" />
            All Resident Bills (সবার বিল তালিকা)
            {billsSummary && (
              <span className="ml-1 text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                {billsSummary.total_residents} residents
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("my")}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === "my"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <FileText className="h-4 w-4" />
            My Personal Bills (আমার বিল)
          </button>
        </div>
      )}

      {/* TAB 1: ALL RESIDENT BILLS (MANAGER VIEW) */}
      {isManager && activeTab === "all" && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          {billsSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                  Total Billed ({selectedMonth})
                </span>
                <div className="text-2xl font-black text-gray-900 mt-1">
                  {formatBDT(billsSummary.total_billed)}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-xs bg-emerald-50/20">
                <span className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">
                  Total Collected (আদায় হয়েছে)
                </span>
                <div className="text-2xl font-black text-emerald-700 mt-1">
                  {formatBDT(billsSummary.total_collected)}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-red-200 p-5 shadow-xs bg-red-50/20">
                <span className="text-xs text-red-700 font-semibold uppercase tracking-wider">
                  Remaining Dues (বকেয়া রয়েছে)
                </span>
                <div className="text-2xl font-black text-red-600 mt-1">
                  {formatBDT(billsSummary.total_remaining_dues)}
                </div>
              </div>
            </div>
          )}

          {/* All Residents Bills Table */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Resident Billing Roster for {selectedMonth}
                </h2>
                <p className="text-xs text-gray-500">
                  Inspect breakdown, print clean PDF invoices, and log cash or online payments.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Resident</th>
                    <th className="py-3 px-4">Bed</th>
                    <th className="py-3 px-4">Meals</th>
                    <th className="py-3 px-4">Fixed Bills</th>
                    <th className="py-3 px-4">Prev Dues</th>
                    <th className="py-3 px-4">Payable</th>
                    <th className="py-3 px-4">Paid</th>
                    <th className="py-3 px-4">Remaining</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allBills.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-gray-400">
                        No bills generated for {selectedMonth} yet. Click &ldquo;Generate Bills&rdquo; above.
                      </td>
                    </tr>
                  ) : (
                    allBills.map((bill) => (
                      <tr key={bill.id} className="hover:bg-gray-50/80 transition">
                        <td className="py-3 px-4 font-bold text-gray-900">
                          <div>{bill.residency?.user?.name || "Resident"}</div>
                          <div className="text-[11px] text-gray-400 font-normal">
                            {bill.residency?.user?.phone || "—"}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-semibold">
                            {bill.residency?.bed?.label || "Unassigned"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-700">{formatBDT(bill.meal_cost_total)}</td>
                        <td className="py-3 px-4 text-gray-700">
                          {formatBDT(bill.fixed_bill_share_total)}
                        </td>
                        <td className="py-3 px-4 text-gray-500">{formatBDT(bill.previous_due)}</td>
                        <td className="py-3 px-4 font-extrabold text-gray-900">
                          {formatBDT(bill.total_payable)}
                        </td>
                        <td className="py-3 px-4 text-emerald-700 font-bold">
                          {formatBDT(bill.total_paid || 0)}
                        </td>
                        <td className="py-3 px-4 font-bold text-red-600">
                          {formatBDT(bill.remaining_due ?? bill.total_payable)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                              bill.status === "paid"
                                ? "bg-emerald-100 text-emerald-800"
                                : bill.status === "partially_paid"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {bill.status === "paid" && <CheckCircle2 className="h-3 w-3" />}
                            {bill.status === "partially_paid" && <Clock className="h-3 w-3" />}
                            {bill.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={`/bills/${bill.id}/invoice`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition"
                              title="View & Print Official A4 Invoice"
                            >
                              <Printer className="h-3.5 w-3.5 text-gray-500" /> Invoice
                            </a>

                            {bill.status !== "paid" && (
                              <button
                                onClick={() => {
                                  setPaymentModal(bill);
                                  setPaymentAmount(
                                    String(bill.remaining_due || bill.total_payable)
                                  );
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition shadow-2xs"
                              >
                                <Plus className="h-3 w-3" /> Log Pay
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PERSONAL RESIDENT INVOICES */}
      {(!isManager || activeTab === "my") && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Your Monthly Invoices</h2>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Billing Month</th>
                  <th className="py-3 px-4">Meal Cost</th>
                  <th className="py-3 px-4">Fixed Bill Share</th>
                  <th className="py-3 px-4">Previous Dues</th>
                  <th className="py-3 px-4">Total Payable</th>
                  <th className="py-3 px-4">Remaining Due</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bills.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400">
                      No bills generated yet for your residency.
                    </td>
                  </tr>
                ) : (
                  bills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-bold text-gray-900">{bill.billing_month}</td>
                      <td className="py-3 px-4 text-gray-700">{formatBDT(bill.meal_cost_total)}</td>
                      <td className="py-3 px-4 text-gray-700">
                        {formatBDT(bill.fixed_bill_share_total)}
                      </td>
                      <td className="py-3 px-4 text-gray-500">{formatBDT(bill.previous_due)}</td>
                      <td className="py-3 px-4 font-extrabold text-gray-900">
                        {formatBDT(bill.total_payable)}
                      </td>
                      <td className="py-3 px-4 font-bold text-red-600">
                        {formatBDT(bill.remaining_due ?? bill.total_payable)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                            bill.status === "paid"
                              ? "bg-emerald-100 text-emerald-800"
                              : bill.status === "partially_paid"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {bill.status === "paid" && <CheckCircle className="h-3 w-3" />}
                          {bill.status === "partially_paid" && <Clock className="h-3 w-3" />}
                          {bill.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`/bills/${bill.id}/invoice`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition"
                          >
                            <Printer className="h-3.5 w-3.5 text-gray-500" /> Invoice
                          </a>

                          {isManager && bill.status !== "paid" && (
                            <button
                              onClick={() => {
                                setPaymentModal(bill);
                                setPaymentAmount(String(bill.remaining_due || bill.total_payable));
                              }}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                            >
                              <Plus className="h-3 w-3" /> Log Payment
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              Record Physical Payment for {paymentModal.billing_month}
            </h3>
            <p className="text-xs text-gray-500">
              Total Payable: {formatBDT(paymentModal.total_payable)} • Remaining Due:{" "}
              {formatBDT(paymentModal.remaining_due ?? paymentModal.total_payable)}
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">Amount Received (BDT)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm bg-white"
                >
                  <option value="cash">Cash (নগদ টাকা)</option>
                  <option value="mobile_banking">bKash / Nagad / Rocket</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Payment Date</label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Note (Optional)</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="e.g. Paid cash at dinner"
                  className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setPaymentModal(null)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
