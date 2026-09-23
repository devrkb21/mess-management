"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Shield,
  QrCode,
  Users,
  FileCheck2,
  UtensilsCrossed,
  CheckCircle2,
  XCircle,
  Clock,
  KeyRound,
  Printer,
  Plus,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Search,
  Check,
  Share2,
} from "lucide-react";

export default function SecurityPage() {
  const { currentMessId, currentResidency, user } = useAuth();

  const [activeTab, setActiveTab] = useState<"dining" | "passes" | "agreements">("dining");
  const [loading, setLoading] = useState(true);

  // Dining QR State (#36)
  const [diningData, setDiningData] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>("lunch");
  const [checkInRoster, setCheckInRoster] = useState<any[]>([]);
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);
  const [checkInResult, setCheckInResult] = useState<any>(null);

  // Passes State (#37)
  const [myPasses, setMyPasses] = useState<any[]>([]);
  const [gatePasses, setGatePasses] = useState<any[]>([]);
  const [showCreatePassModal, setShowCreatePassModal] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [passPurpose, setPassPurpose] = useState("visitor");
  const [passHours, setPassHours] = useState("4");
  const [creatingPass, setCreatingPass] = useState(false);

  // Gatekeeper Verification State
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);

  // Agreement State (#38)
  const [agreement, setAgreement] = useState<any>(null);
  const [signatureName, setSignatureName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [signing, setSigning] = useState(false);
  const [messAgreementsList, setMessAgreementsList] = useState<any[]>([]);

  const isManager = currentResidency?.role === "owner" || currentResidency?.role === "manager";

  const loadSecurityData = async () => {
    if (!currentMessId) return;
    setLoading(true);
    try {
      // 1. Dining Token & Roster
      const [tokenRes, rosterRes] = await Promise.all([
        api.getDiningToken(currentMessId, selectedSlot),
        api.getMealCheckInRoster(currentMessId, { meal_type: selectedSlot }),
      ]);
      setDiningData(tokenRes);
      setCheckInRoster(rosterRes.roster || []);

      // 2. Passes
      const myPassRes = await api.getMyVisitorPasses();
      setMyPasses(myPassRes.data || []);

      if (isManager) {
        const [gateRes, agListRes] = await Promise.all([
          api.getMessVisitorPasses(currentMessId),
          api.getMessAgreements(currentMessId),
        ]);
        setGatePasses(gateRes.data || []);
        setMessAgreementsList(agListRes || []);
      }

      // 3. Agreement for current residency
      if (currentResidency?.id) {
        const agRes = await api.getResidencyAgreement(currentResidency.id);
        setAgreement(agRes.agreement);
        if (agRes.agreement?.signature_name) {
          setSignatureName(agRes.agreement.signature_name);
        }
      }
    } catch (err) {
      console.error("Failed to load security data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSecurityData();
  }, [currentMessId, selectedSlot]);

  // Handle Resident Meal Check-In
  const handleMealCheckIn = async () => {
    if (!currentMessId) return;
    setCheckInSubmitting(true);
    setCheckInResult(null);
    try {
      const res = await api.checkInMeal(currentMessId, {
        meal_type: selectedSlot,
        residency_id: currentResidency?.id,
      });
      setCheckInResult(res);
      loadSecurityData();
    } catch (err: any) {
      setCheckInResult({
        verified: false,
        message: err.message || "Check-in failed",
      });
    } finally {
      setCheckInSubmitting(false);
    }
  };

  // Handle Create Visitor Pass
  const handleCreatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessId) return;
    setCreatingPass(true);
    try {
      await api.createVisitorPass(currentMessId, {
        guest_name: guestName,
        guest_phone: guestPhone || undefined,
        purpose: passPurpose,
        valid_hours: Number(passHours),
      });
      setShowCreatePassModal(false);
      setGuestName("");
      setGuestPhone("");
      loadSecurityData();
    } catch (err: any) {
      alert(err.message || "Failed to create visitor pass");
    } finally {
      setCreatingPass(false);
    }
  };

  // Handle Gatekeeper Verify Code
  const handleVerifyPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessId || !verifyCode.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await api.verifyVisitorPass(currentMessId, verifyCode.trim());
      setVerifyResult(res);
      setVerifyCode("");
      loadSecurityData();
    } catch (err: any) {
      setVerifyResult({
        verified: false,
        message: err.message || "Verification failed",
      });
    } finally {
      setVerifying(false);
    }
  };

  // Handle Sign Agreement
  const handleSignAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentResidency?.id) return;
    setSigning(true);
    try {
      await api.signResidencyAgreement(currentResidency.id, {
        signature_name: signatureName,
        terms_accepted: termsAccepted,
      });
      alert("Contract digitally signed successfully! Verified stamp attached.");
      loadSecurityData();
    } catch (err: any) {
      alert(err.message || "Failed to sign agreement");
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
      {/* Header */}
      <div className="border-b border-gray-200 pb-5 mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-2">
          <Shield className="h-3.5 w-3.5" /> Layer 7: Smart Security (#36–#38)
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
          Security & Access Control
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          QR Dining Check-In fraud prevention, 1-time visitor & parcel gate passes, and digital tenancy contracts.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6 mb-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("dining")}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === "dining"
              ? "border-emerald-600 text-emerald-700 font-bold"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <UtensilsCrossed className="h-4 w-4" /> QR Dining Check-In (#36)
        </button>

        <button
          onClick={() => setActiveTab("passes")}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === "passes"
              ? "border-emerald-600 text-emerald-700 font-bold"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <KeyRound className="h-4 w-4" /> Visitor & Parcel Passes (#37)
        </button>

        <button
          onClick={() => setActiveTab("agreements")}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === "agreements"
              ? "border-emerald-600 text-emerald-700 font-bold"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <FileCheck2 className="h-4 w-4" /> Digital Mess Contract (#38)
        </button>
      </div>

      {/* ── Tab 1: QR Dining Check-In (#36) ── */}
      {activeTab === "dining" && (
        <div className="space-y-6">
          {/* Meal Slot Switcher Bar */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-500 uppercase">Meal Session:</span>
              <div className="flex gap-2">
                {(["breakfast", "lunch", "dinner"] as const).map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition ${
                      selectedSlot === slot
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Check-In CTA */}
            <button
              onClick={handleMealCheckIn}
              disabled={checkInSubmitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow transition flex items-center gap-1.5"
            >
              <QrCode className="h-4 w-4" />
              {checkInSubmitting ? "Verifying..." : "Redeem Meal via QR (#36)"}
            </button>
          </div>

          {/* Check-in result banner */}
          {checkInResult && (
            <div
              className={`p-4 rounded-xl border text-sm font-semibold flex items-center gap-3 ${
                checkInResult.verified
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              {checkInResult.verified ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
              )}
              <span>{checkInResult.message}</span>
            </div>
          )}

          {/* Dining Hall QR Screen & Live Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col: Live Rotating Dining QR Screen */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs flex flex-col items-center text-center">
              <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">
                Dining Hall Live Terminal
              </div>
              <h3 className="font-extrabold text-gray-900 text-lg">
                Scan to Claim {selectedSlot.toUpperCase()}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Display this terminal in the dining room. Residents scan to prevent double eating.
              </p>

              {/* QR Code Container */}
              <div className="my-5 p-4 bg-gray-50 border-2 border-dashed border-emerald-300 rounded-2xl flex flex-col items-center">
                <div className="h-48 w-48 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-inner">
                  <QrCode className="h-40 w-40 text-emerald-800" />
                </div>
                <div className="text-2xs font-mono text-gray-500 mt-2 bg-white px-2 py-1 rounded-sm border">
                  TOKEN: {diningData?.token?.substring(0, 16)}...
                </div>
              </div>

              {/* Live Session Counter */}
              <div className="w-full grid grid-cols-3 gap-2 text-center pt-4 border-t border-gray-100">
                <div className="bg-gray-50 p-2 rounded-lg">
                  <div className="text-lg font-black text-gray-800">{diningData?.total_active_meals || 0}</div>
                  <div className="text-2xs text-gray-500">Meals ON</div>
                </div>
                <div className="bg-emerald-50 p-2 rounded-lg">
                  <div className="text-lg font-black text-emerald-700">{diningData?.checked_in_count || 0}</div>
                  <div className="text-2xs text-emerald-700 font-semibold">Redeemed</div>
                </div>
                <div className="bg-amber-50 p-2 rounded-lg">
                  <div className="text-lg font-black text-amber-700">{diningData?.pending_count || 0}</div>
                  <div className="text-2xs text-amber-700 font-semibold">Remaining</div>
                </div>
              </div>
            </div>

            {/* Right 2 Cols: Live Check-In Roster */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">
                    Dining Hall Real-Time Check-In Roster
                  </h3>
                  <p className="text-xs text-gray-500">
                    Timestamped audit of all residents claiming their {selectedSlot} today.
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[420px]">
                {checkInRoster.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    No meals marked ON or redeemed for this session yet.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {checkInRoster.map((item) => (
                      <div
                        key={item.id}
                        className="py-3 flex items-center justify-between hover:bg-gray-50 px-2 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
                            {item.residency?.user?.name?.charAt(0) || "R"}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm">
                              {item.residency?.user?.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              Bed: {item.residency?.bed?.label || "Assigned"} • Guests: {item.guest_count || 0}
                            </div>
                          </div>
                        </div>

                        <div>
                          {item.checked_in_at ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {new Date(item.checked_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs font-medium px-2.5 py-1 rounded-full">
                              <Clock className="h-3.5 w-3.5" /> Not Checked In
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: Visitor & Parcel Passes (#37) ── */}
      {activeTab === "passes" && (
        <div className="space-y-6">
          {/* Gatekeeper Console & Pass Creator Top Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gatekeeper Fast Verification Box */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md">
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
                <ShieldCheck className="h-4 w-4" /> Gatekeeper Pass Verification Terminal (#37)
              </div>
              <h3 className="text-xl font-extrabold">Verify Guest or Parcel Pass</h3>
              <p className="text-xs text-indigo-200 mt-1 mb-4">
                Enter the 6-character code presented by the visitor or delivery courier.
              </p>

              <form onSubmit={handleVerifyPass} className="flex gap-2">
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="e.g. VP89X2"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.toUpperCase())}
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm font-mono tracking-widest text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-400"
                />
                <button
                  type="submit"
                  disabled={verifying}
                  className="bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-bold px-5 py-2.5 rounded-xl text-sm shadow transition"
                >
                  {verifying ? "Checking..." : "Authorize Entry"}
                </button>
              </form>

              {/* Verification Feedback */}
              {verifyResult && (
                <div
                  className={`mt-4 p-3 rounded-xl border text-xs font-semibold ${
                    verifyResult.verified
                      ? "bg-emerald-500/20 border-emerald-400 text-emerald-200"
                      : "bg-rose-500/20 border-rose-400 text-rose-200"
                  }`}
                >
                  {verifyResult.message}
                  {verifyResult.host && (
                    <div className="mt-1 text-2xs text-white">
                      Host: {verifyResult.host.name} ({verifyResult.host.bed}) • Contact: {verifyResult.host.phone}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Resident Pass Creator Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
                  Resident Gate Pass
                </div>
                <h3 className="text-lg font-bold text-gray-900">Generate 1-Time Visitor Pass</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Expecting food delivery (Foodpanda, Pathao) or a friend? Create a temporary pass to ensure seamless entry at the main gate.
                </p>
              </div>

              <div className="pt-6">
                <button
                  onClick={() => setShowCreatePassModal(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-sm shadow transition flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Create Visitor / Parcel Pass
                </button>
              </div>
            </div>
          </div>

          {/* Active Passes Grid */}
          <div>
            <h3 className="font-bold text-gray-900 text-base mb-3">Your Visitor Passes</h3>
            {myPasses.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
                No passes created yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {myPasses.map((p) => {
                  const isUsed = p.is_used;
                  const isExpired = new Date(p.valid_until) < new Date();

                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-base font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md tracking-wider">
                          {p.pass_code}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-2xs font-bold uppercase ${
                            isUsed
                              ? "bg-blue-100 text-blue-800"
                              : isExpired
                              ? "bg-gray-100 text-gray-500"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {isUsed ? "Checked In" : isExpired ? "Expired" : "Active"}
                        </span>
                      </div>

                      <div className="text-xs space-y-1">
                        <div className="font-bold text-gray-900">{p.guest_name}</div>
                        <div className="text-gray-500 capitalize">Purpose: {p.purpose.replace("_", " ")}</div>
                        <div className="text-gray-400 text-2xs">
                          Expires: {new Date(p.valid_until).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab 3: Digital Tenancy Agreement (#38) ── */}
      {activeTab === "agreements" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-xs max-w-4xl mx-auto">
            {/* Header with Seal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6 mb-6">
              <div>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Official Document
                </span>
                <h2 className="text-2xl font-black text-gray-900 mt-2">
                  Mess Tenancy & Boarding Agreement (#38)
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Legally binding digital residency contract between Mess Management and Resident.
                </p>
              </div>

              {agreement?.status === "signed" ? (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center gap-3">
                  <ShieldCheck className="h-8 w-8 text-emerald-600" />
                  <div className="text-left">
                    <div className="text-xs font-bold text-emerald-900">Digitally Verified & Signed</div>
                    <div className="text-2xs text-emerald-700">
                      Signed by: {agreement.signature_name} • {new Date(agreement.signed_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-800 font-semibold">
                  ⚠️ Action Required: Signature Pending
                </div>
              )}
            </div>

            {/* Contract Terms Content */}
            <div className="space-y-4 text-xs sm:text-sm text-gray-700 leading-relaxed bg-gray-50/50 p-6 rounded-xl border border-gray-200 font-mono">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-200">
                <div>
                  <span className="text-gray-400 block text-2xs uppercase">Mess Name</span>
                  <strong>{currentResidency?.mess?.name}</strong>
                </div>
                <div>
                  <span className="text-gray-400 block text-2xs uppercase">Resident Legal Name</span>
                  <strong>{user?.name}</strong>
                </div>
                <div>
                  <span className="text-gray-400 block text-2xs uppercase">Monthly Bed Rent</span>
                  <strong>৳{Number(agreement?.monthly_rent || 4500).toLocaleString()} /month</strong>
                </div>
                <div>
                  <span className="text-gray-400 block text-2xs uppercase">Security Deposit</span>
                  <strong>৳{Number(agreement?.security_deposit || 3000).toLocaleString()}</strong>
                </div>
              </div>

              <div className="whitespace-pre-line pt-2">
                {agreement?.agreement_terms ||
                  `1. RENT & MEAL PAYMENTS: The resident agrees to pay monthly rent before the 5th of every month. Grocery / meal costs must be settled as calculated by the digital meal rate system.
2. NOTICE PERIOD: Resident must submit a 30-day advance leave notice on the platform before vacating the bed.
3. CONDUCT & QUIET HOURS: No smoking or disruptive noise inside rooms between 11:00 PM and 07:00 AM.
4. FACILITIES & REPAIR: The resident will maintain room cleanliness and will be liable for damages caused to property.
5. REFUND POLICY: Security deposit will be refunded within 3 days of clearance after adjusting all unpaid utility bills and damage charges.`}
              </div>
            </div>

            {/* Signature Area */}
            {agreement?.status === "signed" ? (
              <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400 block">Digital Signature Acknowledgment</span>
                  <span className="font-serif italic text-lg font-bold text-gray-900 underline">
                    {agreement.signature_name}
                  </span>
                  <div className="text-2xs text-gray-400 mt-1 font-mono">
                    IP: {agreement.signed_ip || "127.0.0.1"} • Timestamp: {agreement.signed_at}
                  </div>
                </div>

                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-4 py-2 rounded-lg text-xs transition"
                >
                  <Printer className="h-4 w-4" /> Print Agreement
                </button>
              </div>
            ) : (
              <form onSubmit={handleSignAgreement} className="mt-8 pt-6 border-t border-gray-200 space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    required
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="h-4 w-4 rounded-sm border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="acceptTerms" className="text-xs text-gray-700 font-medium">
                    I have read, understood, and agree to abide by all the mess rules and tenancy terms above.
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Electronic Signature (Type Full Legal Name)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Md. Shuvo Rahman"
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    className="w-full border rounded-lg p-2.5 text-sm font-serif italic text-base"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={signing || !termsAccepted}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm shadow transition"
                  >
                    {signing ? "Affixing Signature..." : "Sign Agreement Digitally (#38)"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Create Pass Modal (#37) ── */}
      {showCreatePassModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-emerald-600" /> Generate Visitor Pass
              </h3>
              <button onClick={() => setShowCreatePassModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePass} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Visitor / Courier Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Foodpanda Rider / Sakib Hasan"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full border rounded-lg p-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Purpose of Visit
                </label>
                <select
                  value={passPurpose}
                  onChange={(e) => setPassPurpose(e.target.value)}
                  className="w-full border rounded-lg p-2.5 text-sm bg-white"
                >
                  <option value="visitor">Personal Guest / Visitor</option>
                  <option value="delivery_parcel">Delivery Parcel / Food Courier</option>
                  <option value="maintenance">Maintenance / Repair Staff</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Pass Validity (Hours)
                </label>
                <select
                  value={passHours}
                  onChange={(e) => setPassHours(e.target.value)}
                  className="w-full border rounded-lg p-2.5 text-sm bg-white"
                >
                  <option value="1">1 Hour</option>
                  <option value="2">2 Hours</option>
                  <option value="4">4 Hours (Recommended)</option>
                  <option value="12">12 Hours</option>
                  <option value="24">24 Hours</option>
                </select>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePassModal(false)}
                  className="px-4 py-2 border rounded-lg text-gray-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPass}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition"
                >
                  {creatingPass ? "Generating..." : "Generate Pass Code"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
