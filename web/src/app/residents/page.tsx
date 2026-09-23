"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Users, QrCode, Plus, Check, Copy, Phone, Mail, ShieldCheck } from "lucide-react";

export default function ResidentsPage() {
  const { currentMessId, currentResidency } = useAuth();
  const [residents, setResidents] = useState<any[]>([]);
  const [beds, setBeds] = useState<any[]>([]);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedBedId, setSelectedBedId] = useState("");
  const [expiresHours, setExpiresHours] = useState("72");
  const [generatedInvite, setGeneratedInvite] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isManager = currentResidency?.role === "owner" || currentResidency?.role === "manager";

  useEffect(() => {
    if (currentMessId) {
      loadData();
    }
  }, [currentMessId]);

  const loadData = async () => {
    try {
      if (!currentMessId) return;
      const [resRes, bedsRes] = await Promise.all([
        api.getResidents(currentMessId),
        api.getBeds(currentMessId),
      ]);
      setResidents(resRes.residents || []);
      setBeds((bedsRes.beds || []).filter((b: any) => b.status === "empty"));
    } catch {
      // ignore
    }
  };

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessId) return;
    setError(null);
    setLoading(true);

    try {
      const res = await api.createInvite(currentMessId, {
        bed_id: selectedBedId || null,
        expires_in_hours: parseInt(expiresHours, 10),
      });

      setGeneratedInvite(res);
      setMessage("Invite code generated! Share this link or code with the applicant.");
    } catch (err: any) {
      setError(err.message || "Failed to create invite.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (inviteCode: string) => {
    setError(null);
    setLoading(true);

    try {
      await api.approveInvite(inviteCode);
      setMessage("Applicant approved and activated as resident!");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to approve resident.");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveResidency = async (residencyId: string, bedId?: string) => {
    setError(null);
    setLoading(true);
    try {
      await api.approveResidency(residencyId, bedId ? { bed_id: bedId } : undefined);
      setMessage("Resident application approved! Bed assigned and residency activated.");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to approve residency.");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pendingApplicants = residents.filter((r) => r.status === "invited");
  const activeResidents = residents.filter((r) => r.status !== "invited");

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resident Directory & Invites</h1>
          <p className="text-sm text-gray-500">
            Manage active mess members, review join applications, and generate invite codes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/join"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition"
          >
            <QrCode className="h-4 w-4 text-gray-500" /> Join Portal (/join)
          </a>

          {isManager && (
            <button
              onClick={() => {
                setGeneratedInvite(null);
                setShowInviteModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
            >
              <Plus className="h-4 w-4" /> Generate Invite Code
            </button>
          )}
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

      {/* Pending Applicants Review Section (Manager Only) */}
      {isManager && pendingApplicants.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
                Pending Join Applications ({pendingApplicants.length})
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">
                These applicants submitted their join code and KYC profile. Review and 1-click approve them to activate their residency.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingApplicants.map((applicant) => (
              <div
                key={applicant.id}
                className="bg-white border border-amber-200 rounded-xl p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{applicant.user?.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {applicant.user?.phone} • {applicant.user?.email}
                    </div>
                  </div>
                  <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                    Awaiting Approval
                  </span>
                </div>

                {/* Profile Details */}
                <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1 text-gray-700">
                  <div>
                    <span className="text-gray-400">NID / Student ID:</span>{" "}
                    <strong>{applicant.profile?.nid_number || "Not provided"}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400">Profession / Institution:</span>{" "}
                    <strong>{applicant.profile?.profession_or_institution || "Not provided"}</strong>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-gray-400">Blood Group:</span>{" "}
                      <strong className="text-red-600">{applicant.profile?.blood_group || "—"}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400">Emergency:</span>{" "}
                      <strong>
                        {applicant.profile?.emergency_contact_name || "—"} ({applicant.profile?.emergency_contact_phone || "—"})
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Bed Assignment & Approve Button */}
                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs text-gray-500">
                    Bed:{" "}
                    <span className="font-semibold text-gray-800">
                      {applicant.bed?.label || "Auto-assign empty bed"}
                    </span>
                  </div>

                  <button
                    onClick={() => handleApproveResidency(applicant.id)}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" /> Approve & Activate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Residents Table */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Resident Roster ({residents.length})</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">Resident</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Assigned Bed</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Profile Info</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {residents.map((res) => (
                <tr key={res.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">
                        {res.user?.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{res.user?.name}</div>
                        <div className="text-xs text-gray-500">Joined: {res.joined_at || "Pending"}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="text-xs text-gray-700 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-gray-400" /> {res.user?.phone}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                      <Mail className="h-3.5 w-3.5 text-gray-400" /> {res.user?.email}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="capitalize font-semibold text-gray-700 text-xs">{res.role}</span>
                  </td>

                  <td className="py-3 px-4 font-medium text-gray-800">
                    {res.bed ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-semibold">
                        {res.bed.label}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Unassigned</span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        res.status === "active"
                          ? "bg-emerald-100 text-emerald-800"
                          : res.status === "on_leave"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {res.status.replace("_", " ")}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-xs text-gray-600">
                    {res.profile ? (
                      <div>
                        <div className="font-medium">{res.profile.profession_or_institution || "—"}</div>
                        <div className="text-gray-400">
                          Blood: {res.profile.blood_group || "—"} • Emg: {res.profile.emergency_contact_phone || "—"}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <QrCode className="h-5 w-5 text-emerald-600" /> Generate Invite Code / QR
            </h3>

            {!generatedInvite ? (
              <form onSubmit={handleGenerateInvite} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Pre-assign Bed (Optional)
                  </label>
                  <select
                    value={selectedBedId}
                    onChange={(e) => setSelectedBedId(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm bg-white"
                  >
                    <option value="">Auto-assign first available bed</option>
                    {beds.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label} ({b.room?.name || "Room"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700">Expires In (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    max="720"
                    required
                    value={expiresHours}
                    onChange={(e) => setExpiresHours(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 text-sm text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700"
                  >
                    Generate Invite Code
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-center py-2">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                    Invite Code
                  </span>
                  <div className="text-3xl font-black text-emerald-700 tracking-widest mt-1">
                    {generatedInvite.invite.code}
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  Share this code with the applicant. They can enter it during sign-up to join this mess.
                </div>

                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                  <span className="truncate flex-1 text-gray-700 text-left font-mono">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/join?code=${generatedInvite.invite.code}`
                      : generatedInvite.invite_link}
                  </span>
                  <button
                    onClick={() =>
                      copyLink(
                        typeof window !== "undefined"
                          ? `${window.location.origin}/join?code=${generatedInvite.invite.code}`
                          : generatedInvite.invite_link
                      )
                    }
                    className="p-1.5 text-emerald-600 hover:text-emerald-700 font-semibold"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>

                <button
                  onClick={() => setShowInviteModal(false)}
                  className="w-full rounded-lg bg-gray-900 py-2 text-sm font-semibold text-white"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
