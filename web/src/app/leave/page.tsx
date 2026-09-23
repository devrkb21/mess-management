"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatBDT } from "@/lib/utils";
import { DoorOpen, CheckCircle2, ShieldCheck, AlertCircle, Users, Check } from "lucide-react";

export default function LeavePage() {
  const { currentMessId, currentResidency, refreshUser } = useAuth();
  const isManager = currentResidency?.role === "owner" || currentResidency?.role === "manager";

  const [plannedLeaveDate, setPlannedLeaveDate] = useState("");
  const [clearanceData, setClearanceData] = useState<any>(null);
  const [messLeaves, setMessLeaves] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentMessId && isManager) {
      loadMessLeaves();
    }
  }, [currentMessId, isManager]);

  const loadMessLeaves = async () => {
    try {
      if (!currentMessId) return;
      const res = await api.getMessLeaves(currentMessId);
      setMessLeaves(res.leaves || []);
    } catch {
      // ignore
    }
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentResidency?.id) return;
    setError(null);
    setLoading(true);

    try {
      const res = await api.submitLeave(currentResidency.id, {
        planned_leave_date: plannedLeaveDate,
      });
      setClearanceData(res.clearance);
      setMessage("Leave notice submitted successfully. Final settlement calculated below.");
      await refreshUser();
      if (isManager) {
        loadMessLeaves();
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit leave notice.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeClearance = async (leaveId: string) => {
    if (!confirm("Finalize move-out clearance? This will free the resident's bed and mark their residency as left.")) {
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await api.finalizeClearance(leaveId);
      setMessage("Clearance finalized! The bed has been freed and marked empty.");
      loadMessLeaves();
    } catch (err: any) {
      setError(err.message || "Failed to finalize clearance.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leave Notice & Clearance Settlement</h1>
        <p className="text-sm text-gray-500">
          When permanently moving out of the mess, submit your planned leave date for dues clearance and security deposit refund.
        </p>
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

      {/* Form */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
            <DoorOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Submit Move-out Notice</h2>
            <p className="text-xs text-gray-500">
              Your security deposit: {formatBDT(currentResidency?.security_deposit_amount || 0)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmitLeave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700">Planned Move-out Date</label>
            <input
              type="date"
              required
              value={plannedLeaveDate}
              onChange={(e) => setPlannedLeaveDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 p-2.5 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white shadow-xs hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? "Calculating..." : "Submit Notice & Calculate Settlement"}
          </button>
        </form>
      </div>

      {/* Settlement Card */}
      {clearanceData && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-bold text-gray-900">Clearance Statement</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
            <div>
              <span className="text-xs text-gray-500">Notice Date</span>
              <div className="font-bold text-gray-800 text-sm">{clearanceData.notice_date}</div>
            </div>
            <div>
              <span className="text-xs text-gray-500">Planned Move-out</span>
              <div className="font-bold text-gray-800 text-sm">{clearanceData.planned_leave_date}</div>
            </div>
            <div>
              <span className="text-xs text-gray-500">Total Outstanding Dues</span>
              <div className="font-bold text-red-600 text-lg">{formatBDT(clearanceData.final_dues)}</div>
            </div>
            <div>
              <span className="text-xs text-gray-500">Security Deposit Refund</span>
              <div className="font-bold text-emerald-600 text-lg">
                {formatBDT(clearanceData.deposit_refunded)}
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
            Upon physical move-out, the manager finalizes this record to clear all dues and mark the bed vacant.
          </div>
        </div>
      )}

      {/* Manager Clearance Reviews Section */}
      {isManager && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Manager Clearance Roster (ছাড়পত্র পর্যালোচনা ও বেড খালি করা)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Review submitted move-out notices, dues & security deposit refunds. Click finalize upon departure to mark bed vacant.
              </p>
            </div>
            {messLeaves.length > 0 && (
              <span className="text-xs font-bold bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full">
                {messLeaves.length} records
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Resident</th>
                  <th className="py-2.5 px-4">Bed</th>
                  <th className="py-2.5 px-4">Leave Date</th>
                  <th className="py-2.5 px-4 text-right">Final Dues</th>
                  <th className="py-2.5 px-4 text-right">Refund Amount</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {messLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      No resident leave clearance requests submitted yet.
                    </td>
                  </tr>
                ) : (
                  messLeaves.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-gray-900">{l.residency?.user?.name || "Resident"}</div>
                        <div className="text-[11px] text-gray-400">{l.residency?.user?.phone || "—"}</div>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-semibold">
                          {l.residency?.bed?.label || "Unassigned"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-xs font-medium text-gray-700">
                        {l.planned_leave_date}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-red-600">
                        {formatBDT(l.final_dues)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-emerald-600">
                        {formatBDT(l.deposit_refunded)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                            l.status === "cleared"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {l.status === "cleared" && <CheckCircle2 className="h-3 w-3" />}
                          {l.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {l.status === "pending" ? (
                          <button
                            onClick={() => handleFinalizeClearance(l.id)}
                            disabled={loading}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs transition disabled:opacity-50"
                          >
                            <Check className="h-3.5 w-3.5" /> Finalize & Free Bed
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">Bed Vacated</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
