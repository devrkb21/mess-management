"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import Link from "next/navigation";
import {
  ShieldCheck,
  Building,
  UserCheck,
  Phone,
  CreditCard,
  Briefcase,
  Droplet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";

function JoinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: authLoading, refreshUser } = useAuth();

  const [code, setCode] = useState(() => searchParams.get("code") || "");
  const [invitePreview, setInvitePreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Profile form
  const [nidNumber, setNidNumber] = useState("");
  const [profession, setProfession] = useState("");
  const [bloodGroup, setBloodGroup] = useState("A+");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const queryCode = searchParams.get("code");
    if (queryCode) {
      setCode(queryCode);
      lookupInvite(queryCode);
    }
  }, [searchParams]);

  const lookupInvite = async (inviteCode: string) => {
    if (!inviteCode || inviteCode.trim().length < 4) return;
    setPreviewLoading(true);
    setError(null);
    try {
      const res = await api.getInvite(inviteCode.trim());
      setInvitePreview(res.invite);
    } catch (err: any) {
      setInvitePreview(null);
      setError(err.message || "Invalid or expired invite code.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("Please enter a valid invite code.");
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      await api.acceptInvite(code.trim(), {
        nid_number: nidNumber.trim() || undefined,
        profession_or_institution: profession.trim() || undefined,
        blood_group: bloodGroup,
        emergency_contact_name: emergencyName.trim() || undefined,
        emergency_contact_phone: emergencyPhone.trim() || undefined,
      });

      setSuccess(true);
      await refreshUser();
    } catch (err: any) {
      setError(err.message || "Failed to submit residency application.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-8 text-white">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="h-3.5 w-3.5" /> Resident Onboarding Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">Join a Mess Community</h1>
          <p className="text-emerald-100 text-sm mt-1">
            Enter your invitation code and submit your resident KYC profile for manager approval.
          </p>
        </div>

        <div className="p-8 space-y-6">
          {/* Auth check warning */}
          {!authLoading && !user && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800">
                <p className="font-bold">You are not logged in!</p>
                <p className="mt-0.5">
                  You need an active user account to join a mess. Please{" "}
                  <a href="/login" className="underline font-bold text-amber-900">
                    Log In
                  </a>{" "}
                  or{" "}
                  <a href="/register" className="underline font-bold text-amber-900">
                    Register
                  </a>{" "}
                  first.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 border border-red-200 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="text-center py-8 space-y-4">
              <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Application Submitted!</h2>
              <p className="text-sm text-gray-600 max-w-md mx-auto">
                Your profile has been sent to the mess manager. As soon as the manager reviews and approves
                your application, this mess will automatically appear in your active mess dashboard.
              </p>

              <div className="pt-4 flex justify-center gap-3">
                <button
                  onClick={() => router.push("/")}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 font-bold text-white shadow-md hover:bg-emerald-700 transition"
                >
                  Go to Dashboard <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Step 1: Invite Code */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  1. Invitation Code (ইনভাইট কোড)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. ABC123XY"
                    value={code}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setCode(val);
                      if (val.length >= 6) {
                        lookupInvite(val);
                      }
                    }}
                    className="block w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-mono uppercase font-bold tracking-wider text-gray-900 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => lookupInvite(code)}
                    disabled={previewLoading || !code}
                    className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100 transition shrink-0 disabled:opacity-50"
                  >
                    {previewLoading ? "Verifying..." : "Verify Code"}
                  </button>
                </div>
              </div>

              {/* Invite Preview Card */}
              {invitePreview && (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <Building className="h-4 w-4" />
                    <span>{invitePreview.mess?.name}</span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-0.5 pl-6">
                    <p>📍 {invitePreview.mess?.address}, {invitePreview.mess?.city}</p>
                    <p>
                      🛏️ Assigned Bed:{" "}
                      <span className="font-semibold text-emerald-700">
                        {invitePreview.bed?.label || "Auto-assign on arrival"}
                      </span>
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Policy: {invitePreview.mess?.gender_policy} mess
                    </p>
                  </div>
                </div>
              )}

              {/* Step 2: KYC Details */}
              <div className="pt-2 border-t border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    2. Resident Profile Details (পরিচিতি ও কেওয়াইসি)
                  </label>
                  <span className="text-[11px] text-gray-400">Required by Mess Authority</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                      <CreditCard className="h-3.5 w-3.5 text-gray-400" /> NID or Student ID Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1998123456789"
                      value={nidNumber}
                      onChange={(e) => setNidNumber(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5 text-gray-400" /> Profession / University
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Student, DU / Software Engineer"
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                      <Droplet className="h-3.5 w-3.5 text-red-400" /> Blood Group
                    </label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm bg-white focus:border-emerald-500 focus:ring-emerald-500"
                    >
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                      <UserCheck className="h-3.5 w-3.5 text-gray-400" /> Emergency Contact Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Father / Brother"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-gray-400" /> Emergency Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="017XXXXXXXX"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Action */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <a
                  href="/"
                  className="text-xs font-bold text-gray-500 hover:text-gray-700 transition"
                >
                  Cancel & Return Home
                </a>

                <button
                  type="submit"
                  disabled={submitting || !user}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting Application..." : "Submit Join Application"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading Join Portal...</div>}>
      <JoinContent />
    </Suspense>
  );
}
