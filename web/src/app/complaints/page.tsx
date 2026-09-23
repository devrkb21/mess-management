"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { MessageSquareWarning, Plus, CheckCircle2, Clock } from "lucide-react";

export default function ComplaintsPage() {
  const { currentMessId, currentResidency } = useAuth();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const [resolveModal, setResolveModal] = useState<any>(null);
  const [resolveStatus, setResolveStatus] = useState<"in_progress" | "resolved" | "closed">("resolved");
  const [resolveNote, setResolveNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isManager = currentResidency?.role === "owner" || currentResidency?.role === "manager";

  useEffect(() => {
    if (currentMessId) {
      loadComplaints();
    }
  }, [currentMessId]);

  const loadComplaints = async () => {
    try {
      if (!currentMessId) return;
      const res = await api.getComplaints(currentMessId);
      setComplaints(res.complaints || []);
    } catch {
      // ignore
    }
  };

  const handleFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentResidency?.id) return;
    setLoading(true);

    try {
      await api.fileComplaint(currentResidency.id, { subject, description });
      setShowModal(false);
      setSubject("");
      setDescription("");
      setMessage("Complaint submitted. The manager has been notified.");
      loadComplaints();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveModal) return;
    setLoading(true);

    try {
      await api.updateComplaint(resolveModal.id, {
        status: resolveStatus,
        resolved_note: resolveNote || null,
      });
      setResolveModal(null);
      setMessage("Complaint status updated.");
      loadComplaints();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Complaints & Requests</h1>
          <p className="text-sm text-gray-500">
            Submit issues regarding maintenance, meals, or mess facilities.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-700"
        >
          <Plus className="h-4 w-4" /> File New Complaint
        </button>
      </div>

      {message && (
        <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 border border-emerald-200">
          {message}
        </div>
      )}

      {/* Complaints List */}
      <div className="space-y-4">
        {complaints.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <MessageSquareWarning className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <h3 className="font-bold text-gray-800">No complaints filed</h3>
            <p className="text-xs text-gray-500 mt-1">Everything looks smooth in the mess!</p>
          </div>
        ) : (
          complaints.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        c.status === "resolved"
                          ? "bg-emerald-100 text-emerald-800"
                          : c.status === "in_progress"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {c.status === "resolved" && <CheckCircle2 className="h-3 w-3" />}
                      {c.status === "in_progress" && <Clock className="h-3 w-3" />}
                      {c.status.replace("_", " ")}
                    </span>
                    <h3 className="text-base font-bold text-gray-900">{c.subject}</h3>
                  </div>
                  <p className="mt-2 text-sm text-gray-700">{c.description}</p>
                </div>

                {isManager && c.status !== "resolved" && (
                  <button
                    onClick={() => {
                      setResolveModal(c);
                      setResolveStatus("resolved");
                      setResolveNote(c.resolved_note || "");
                    }}
                    className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                  >
                    Update Status
                  </button>
                )}
              </div>

              {c.resolved_note && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800">
                  <span className="font-bold">Manager Resolution: </span>
                  {c.resolved_note}
                </div>
              )}

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                <span>Filed by {c.residency?.user?.name || "Resident"}</span>
                <span>{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* File Complaint Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">File a Complaint</h3>
            <form onSubmit={handleFile} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Water shortage, WiFi issue..."
                  className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Detailed Description</label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain the problem in detail..."
                  className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-700"
                >
                  Submit Complaint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Update Complaint Status</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Status</label>
                <select
                  value={resolveStatus}
                  onChange={(e: any) => setResolveStatus(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm bg-white"
                >
                  <option value="in_progress">In Progress (চলমান)</option>
                  <option value="resolved">Resolved (সমাধান হয়েছে)</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Resolution Note</label>
                <textarea
                  rows={3}
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  placeholder="e.g. Plumber repaired the faucet today."
                  className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolveModal(null)}
                  className="px-4 py-2 text-sm text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700"
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
