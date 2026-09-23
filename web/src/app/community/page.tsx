"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Award,
  Sparkles,
  HeartHandshake,
  Star,
  CheckCircle2,
  AlertCircle,
  Moon,
  Sun,
  BookOpen,
  Sparkle,
  Cigarette,
  Users,
  ShieldCheck,
  TrendingUp,
  MessageSquare,
  ChevronRight,
  UserCheck,
} from "lucide-react";

export default function CommunityPage() {
  const { currentMessId, currentResidency, user } = useAuth();

  const [activeTab, setActiveTab] = useState<"trust" | "lifestyle" | "reviews">("trust");
  const [loading, setLoading] = useState(true);

  // Trust Score State (#40)
  const [userTrust, setUserTrust] = useState<any>(null);
  const [messTrust, setMessTrust] = useState<any>(null);

  // Lifestyle Profile State (#41)
  const [lifestyle, setLifestyle] = useState({
    sleep_schedule: "flexible",
    study_work_habits: "moderate",
    cleanliness_level: "moderate",
    smoking_policy: "non_smoker",
    guest_frequency: "occasional",
  });
  const [savingLifestyle, setSavingLifestyle] = useState(false);
  const [lifestyleSavedMsg, setLifestyleSavedMsg] = useState("");

  // Reviews State (#39)
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewType, setReviewType] = useState<"resident_to_mess" | "manager_to_resident">("resident_to_mess");
  const [selectedResidentId, setSelectedResidentId] = useState("");
  const [residentsList, setResidentsList] = useState<any[]>([]);
  const [ratingOverall, setRatingOverall] = useState(5);
  const [ratingFood, setRatingFood] = useState(5);
  const [ratingCleanliness, setRatingCleanliness] = useState(5);
  const [ratingPunctuality, setRatingPunctuality] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const isManager = currentResidency?.role === "owner" || currentResidency?.role === "manager";

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. User Trust Score
      if (user?.id) {
        const uScore = await api.getUserTrustScore(user.id).catch(() => null);
        if (uScore) setUserTrust(uScore);
      }

      // 2. Mess Trust Score
      if (currentMessId) {
        const mScore = await api.getMessTrustScore(currentMessId).catch(() => null);
        if (mScore) setMessTrust(mScore);
      }

      // 3. User Lifestyle Profile
      const lifeRes = await api.getLifestyleProfile().catch(() => null);
      if (lifeRes?.profile) {
        setLifestyle({
          sleep_schedule: lifeRes.profile.sleep_schedule || "flexible",
          study_work_habits: lifeRes.profile.study_work_habits || "moderate",
          cleanliness_level: lifeRes.profile.cleanliness_level || "moderate",
          smoking_policy: lifeRes.profile.smoking_policy || "non_smoker",
          guest_frequency: lifeRes.profile.guest_frequency || "occasional",
        });
      }

      // 4. Resident roster if manager
      if (isManager && currentMessId) {
        const resList = await api.getResidents(currentMessId).catch(() => ({ residents: [] }));
        setResidentsList(resList.residents || []);
      }
    } catch (err) {
      console.error("Failed to load community data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id, currentMessId]);

  // Handle saving lifestyle questionnaire
  const handleSaveLifestyle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLifestyle(true);
    setLifestyleSavedMsg("");
    try {
      await api.saveLifestyleProfile(lifestyle);
      setLifestyleSavedMsg("Lifestyle profile saved successfully! Your roommate compatibility matching is updated.");
      setTimeout(() => setLifestyleSavedMsg(""), 5000);
    } catch (err: any) {
      alert(err.message || "Failed to update profile");
    } finally {
      setSavingLifestyle(false);
    }
  };

  // Handle submitting a review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessId) return;
    setSubmittingReview(true);
    try {
      await api.submitReview({
        mess_id: currentMessId,
        type: reviewType,
        reviewee_id: reviewType === "manager_to_resident" ? selectedResidentId : undefined,
        rating_overall: ratingOverall,
        rating_food: ratingFood,
        rating_cleanliness: ratingCleanliness,
        rating_punctuality: ratingPunctuality,
        comment: reviewComment || undefined,
      });
      alert("Review submitted successfully! Thank you for strengthening our trust network.");
      setShowReviewModal(false);
      setReviewComment("");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <Award className="h-6 w-6" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Trust & Community Network
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Build your verified reputation, find compatible roommates, and participate in peer-to-peer ratings.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-gray-100 p-1 rounded-xl">
          {[
            { key: "trust", label: "Trust Score", icon: ShieldCheck },
            { key: "lifestyle", label: "Lifestyle Quiz", icon: HeartHandshake },
            { key: "reviews", label: "Community Reviews", icon: Star },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  active ? "bg-white text-emerald-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-400">Loading community data...</div>
      ) : (
        <>
          {/* TAB 1: TRUST SCORE (#40) */}
          {activeTab === "trust" && (
            <div className="space-y-8">
              {/* Primary User Trust Banner */}
              <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-gray-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                  <div className="space-y-3 max-w-xl text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                      <Sparkles className="h-3.5 w-3.5" />
                      Antigravity Trust Protocol
                    </div>
                    <h2 className="text-3xl font-extrabold tracking-tight">
                      {userTrust?.badge_title || "Verified Member"}
                    </h2>
                    <p className="text-emerald-100 text-sm leading-relaxed">
                      Your Trust Score reflects your verified payment reliability, peer exit evaluations, clean clearance record, and identity credentials.
                    </p>
                  </div>

                  {/* Circular Score Badge */}
                  <div className="flex flex-col items-center justify-center p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 w-48 h-48 text-center shrink-0">
                    <span className="text-5xl font-black tracking-tight text-emerald-300">
                      {userTrust?.trust_score ?? 90}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-widest text-white/70 mt-1">
                      Out of 100
                    </span>
                    <span className="mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200">
                      Tier: {userTrust?.badge?.toUpperCase() || "ELITE"}
                    </span>
                  </div>
                </div>

                {/* Score Breakdown Bars */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/10">
                  <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                    <div className="text-xs text-emerald-200 font-semibold mb-1">
                      On-Time Payments (40%)
                    </div>
                    <div className="text-xl font-bold">
                      {userTrust?.breakdown?.payment_score ?? 36} / 40 pts
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-emerald-400 h-full rounded-full"
                        style={{ width: `${((userTrust?.breakdown?.payment_score ?? 36) / 40) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                    <div className="text-xs text-emerald-200 font-semibold mb-1">
                      Exit Ratings (35%)
                    </div>
                    <div className="text-xl font-bold">
                      {userTrust?.breakdown?.review_score ?? 32} / 35 pts
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-emerald-400 h-full rounded-full"
                        style={{ width: `${((userTrust?.breakdown?.review_score ?? 32) / 35) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                    <div className="text-xs text-emerald-200 font-semibold mb-1">
                      Clearance Discipline (15%)
                    </div>
                    <div className="text-xl font-bold">
                      {userTrust?.breakdown?.clearance_score ?? 15} / 15 pts
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-emerald-400 h-full rounded-full"
                        style={{ width: `${((userTrust?.breakdown?.clearance_score ?? 15) / 15) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                    <div className="text-xs text-emerald-200 font-semibold mb-1">
                      KYC Verification (10%)
                    </div>
                    <div className="text-xl font-bold">
                      {userTrust?.breakdown?.kyc_score ?? 10} / 10 pts
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-emerald-400 h-full rounded-full"
                        style={{ width: `${((userTrust?.breakdown?.kyc_score ?? 10) / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Trust Badge Perks & Privileges */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-start gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Instant Approval Fast-Track</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Managers prioritize applicants with 85+ Trust Scores, waiving extensive manual interviews.
                    </p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-start gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Deposit Discount Eligibility</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Elite badge holders qualify for 50% reduced security deposit requirements in participating partner messes.
                    </p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-start gap-4">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                    <Star className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Badge on Marketplace Profile</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Your verified badge shines beside your name when chatting with managers and booking new beds.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIFESTYLE COMPATIBILITY QUIZ (#41) */}
          {activeTab === "lifestyle" && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                    <HeartHandshake className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Roommate Lifestyle Quiz</h2>
                    <p className="text-xs text-gray-500">
                      Answer these 5 quick questions so our algorithm can match you with culturally harmonious messes and roommates.
                    </p>
                  </div>
                </div>

                {lifestyleSavedMsg && (
                  <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    {lifestyleSavedMsg}
                  </div>
                )}

                <form onSubmit={handleSaveLifestyle} className="space-y-6">
                  {/* 1. Sleep Schedule */}
                  <div>
                    <label className="text-sm font-semibold text-gray-800 block mb-2">
                      1. Sleep & Wake Schedule
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: "early_bird", label: "Early Bird", desc: "Sleep before 11pm, wake early", icon: Sun },
                        { id: "night_owl", label: "Night Owl", desc: "Active late nights, sleep after 1am", icon: Moon },
                        { id: "flexible", label: "Flexible", desc: "Adaptable schedule", icon: Sparkle },
                      ].map((item) => {
                        const Icon = item.icon;
                        const isSelected = lifestyle.sleep_schedule === item.id;
                        return (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => setLifestyle({ ...lifestyle, sleep_schedule: item.id })}
                            className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                              isSelected
                                ? "border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-600/20"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <Icon className={`h-5 w-5 mb-2 ${isSelected ? "text-emerald-600" : "text-gray-400"}`} />
                            <span className="text-sm font-bold block">{item.label}</span>
                            <span className="text-xs text-gray-500 mt-1">{item.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Study & Work Habits */}
                  <div>
                    <label className="text-sm font-semibold text-gray-800 block mb-2">
                      2. Room Study & Work Environment
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: "silent", label: "Pin-Drop Silent", desc: "Needs absolute silence to focus" },
                        { id: "moderate", label: "Moderate Vibe", desc: "Low background music or headphones ok" },
                        { id: "lively", label: "Lively & Collaborative", desc: "Open discussions & group work" },
                      ].map((item) => {
                        const isSelected = lifestyle.study_work_habits === item.id;
                        return (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => setLifestyle({ ...lifestyle, study_work_habits: item.id })}
                            className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                              isSelected
                                ? "border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-600/20"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <span className="text-sm font-bold block">{item.label}</span>
                            <span className="text-xs text-gray-500 mt-1">{item.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Cleanliness Standards */}
                  <div>
                    <label className="text-sm font-semibold text-gray-800 block mb-2">
                      3. Cleanliness Standards
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: "strict", label: "Strict & Tidy", desc: "Daily sweeping, neat bed, zero clutter" },
                        { id: "moderate", label: "Normal / Moderate", desc: "Weekly cleanup, standard tidiness" },
                        { id: "relaxed", label: "Relaxed", desc: "Comfortable with casual living mess" },
                      ].map((item) => {
                        const isSelected = lifestyle.cleanliness_level === item.id;
                        return (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => setLifestyle({ ...lifestyle, cleanliness_level: item.id })}
                            className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                              isSelected
                                ? "border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-600/20"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <span className="text-sm font-bold block">{item.label}</span>
                            <span className="text-xs text-gray-500 mt-1">{item.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4. Smoking Policy */}
                  <div>
                    <label className="text-sm font-semibold text-gray-800 block mb-2">
                      4. Smoking Policy Preference
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: "non_smoker", label: "Strict Non-Smoker", desc: "100% smoke-free room & building" },
                        { id: "smoker_outside", label: "Smoker (Outside Only)", desc: "Balcony or terrace only" },
                        { id: "no_preference", label: "No Preference", desc: "Open to any smoking policy" },
                      ].map((item) => {
                        const isSelected = lifestyle.smoking_policy === item.id;
                        return (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => setLifestyle({ ...lifestyle, smoking_policy: item.id })}
                            className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                              isSelected
                                ? "border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-600/20"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <span className="text-sm font-bold block">{item.label}</span>
                            <span className="text-xs text-gray-500 mt-1">{item.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 5. Guest Frequency */}
                  <div>
                    <label className="text-sm font-semibold text-gray-800 block mb-2">
                      5. Guest & Visitor Frequency
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: "rare", label: "Rare / None", desc: "Prefers quiet privacy without outside guests" },
                        { id: "occasional", label: "Occasional", desc: "Friends visit 1-2 times a week" },
                        { id: "frequent", label: "Frequent / Social", desc: "Enjoys having visitors regularly" },
                      ].map((item) => {
                        const isSelected = lifestyle.guest_frequency === item.id;
                        return (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => setLifestyle({ ...lifestyle, guest_frequency: item.id })}
                            className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                              isSelected
                                ? "border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-600/20"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <span className="text-sm font-bold block">{item.label}</span>
                            <span className="text-xs text-gray-500 mt-1">{item.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingLifestyle}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors"
                  >
                    {savingLifestyle ? "Updating Matching Vector..." : "Save My Lifestyle Profile"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: COMMUNITY REVIEWS (#39) */}
          {activeTab === "reviews" && (
            <div className="space-y-8">
              {/* Header Action Row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Peer Evaluations & Exit Ratings</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Transparent two-way feedback between mess managers and residents upon tenancy exit.
                  </p>
                </div>
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  <Star className="h-4 w-4" />
                  Leave Exit Review
                </button>
              </div>

              {/* Mess Community Scorecard */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-8 items-center">
                <div className="text-center p-6 bg-emerald-50 rounded-2xl border border-emerald-100 min-w-[180px]">
                  <div className="text-4xl font-extrabold text-emerald-800">
                    {messTrust?.rating_overall?.toFixed(1) || "5.0"}
                  </div>
                  <div className="flex items-center justify-center gap-1 my-1 text-amber-500">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <div className="text-xs text-emerald-600 font-semibold">
                    {messTrust?.total_reviews ?? 0} verified reviews
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <span className="text-xs text-gray-500 block">Food & Dining Quality</span>
                    <span className="text-lg font-bold text-gray-900">
                      {messTrust?.rating_food?.toFixed(1) || "5.0"} / 5.0
                    </span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <span className="text-xs text-gray-500 block">Cleanliness & Hygiene</span>
                    <span className="text-lg font-bold text-gray-900">
                      {messTrust?.rating_cleanliness?.toFixed(1) || "5.0"} / 5.0
                    </span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <span className="text-xs text-gray-500 block">Management & Fairness</span>
                    <span className="text-lg font-bold text-gray-900">
                      {messTrust?.rating_punctuality?.toFixed(1) || "5.0"} / 5.0
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Reviews List */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-gray-900">Recent Resident Testimonials</h3>
                {messTrust?.recent_reviews?.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 text-gray-400 text-sm">
                    No community reviews posted yet. Be the first to rate your mess living experience!
                  </div>
                ) : (
                  messTrust?.recent_reviews?.map((r: any) => (
                    <div key={r.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs">
                            {r.reviewer_name?.[0] || "R"}
                          </div>
                          <div>
                            <span className="font-bold text-sm text-gray-900 block">{r.reviewer_name}</span>
                            <span className="text-xs text-gray-400">{r.created_at}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-amber-500">
                          {[...Array(r.rating_overall || 5)].map((_, i) => (
                            <Star key={i} className="h-3.5 w-3.5 fill-current" />
                          ))}
                        </div>
                      </div>
                      {r.comment && <p className="text-sm text-gray-700 pt-2 leading-relaxed">{r.comment}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL: LEAVE REVIEW (#39) */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Submit Exit Evaluation</h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {isManager && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Review Target
                  </label>
                  <select
                    value={reviewType}
                    onChange={(e: any) => setReviewType(e.target.value)}
                    className="w-full text-xs font-medium border border-gray-300 rounded-xl p-2.5"
                  >
                    <option value="resident_to_mess">Review Mess As Resident</option>
                    <option value="manager_to_resident">Manager Review for Exited Resident</option>
                  </select>
                </div>
              )}

              {reviewType === "manager_to_resident" && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Select Resident *
                  </label>
                  <select
                    value={selectedResidentId}
                    onChange={(e) => setSelectedResidentId(e.target.value)}
                    required
                    className="w-full text-xs font-medium border border-gray-300 rounded-xl p-2.5"
                  >
                    <option value="">-- Choose Resident --</option>
                    {residentsList.map((r) => (
                      <option key={r.user_id || r.id} value={r.user_id || r.user?.id}>
                        {r.user?.name || r.name} ({r.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Overall Score (1 to 5 Stars): {ratingOverall}
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={ratingOverall}
                  onChange={(e) => setRatingOverall(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Food / Punctuality ({ratingFood}★)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={ratingFood}
                    onChange={(e) => setRatingFood(Number(e.target.value))}
                    className="w-full accent-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Cleanliness ({ratingCleanliness}★)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={ratingCleanliness}
                    onChange={(e) => setRatingCleanliness(Number(e.target.value))}
                    className="w-full accent-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Feedback & Comments
                </label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share details about meal quality, roommate harmony, or deposit refund speed..."
                  className="w-full text-xs border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
                >
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
