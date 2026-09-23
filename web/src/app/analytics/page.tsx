"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  TrendingUp,
  Sparkles,
  Flame,
  UtensilsCrossed,
  BedDouble,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Send,
  Languages,
  DollarSign,
  Calendar,
  Layers,
  ArrowRight,
  Lightbulb,
  Building2,
} from "lucide-react";

export default function AnalyticsPage() {
  const { currentMessId, currentResidency } = useAuth();
  const isManager = currentResidency?.role === "owner" || currentResidency?.role === "manager";

  const [activeTab, setActiveTab] = useState<"budget" | "waste" | "occupancy" | "notice">("budget");
  const [loading, setLoading] = useState(true);

  // #45 Predictive Budget State
  const [budgetData, setBudgetData] = useState<any>(null);

  // #43 Financial & Waste State
  const [wasteData, setWasteData] = useState<any>(null);

  // #46 Occupancy State
  const [occupancyData, setOccupancyData] = useState<any>(null);

  // #44 Bilingual AI Notice Writer State
  const [noticePrompt, setNoticePrompt] = useState("");
  const [noticeTone, setNoticeTone] = useState("formal");
  const [noticeCategory, setNoticeCategory] = useState("general");
  const [generatingNotice, setGeneratingNotice] = useState(false);
  const [generatedNotice, setGeneratedNotice] = useState<any>(null);
  const [publishingNotice, setPublishingNotice] = useState(false);

  const loadAnalytics = async () => {
    if (!currentMessId) return;
    setLoading(true);
    try {
      const [budgetRes, wasteRes, occRes] = await Promise.all([
        api.getPredictiveBudget(currentMessId).catch(() => null),
        api.getFinancialAndWaste(currentMessId).catch(() => null),
        api.getOccupancyAnalytics(currentMessId).catch(() => null),
      ]);
      if (budgetRes) setBudgetData(budgetRes);
      if (wasteRes) setWasteData(wasteRes);
      if (occRes) setOccupancyData(occRes);
    } catch (err) {
      console.error("Failed to load analytics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [currentMessId]);

  // #44 Generate AI Notice
  const handleGenerateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessId || !noticePrompt.trim()) return;
    setGeneratingNotice(true);
    try {
      const res = await api.generateAiNotice(currentMessId, {
        prompt: noticePrompt.trim(),
        tone: noticeTone,
        category: noticeCategory,
      });
      setGeneratedNotice(res.draft);
    } catch (err: any) {
      alert(err.message || "Failed to generate AI notice");
    } finally {
      setGeneratingNotice(false);
    }
  };

  // #44 Publish directly to Notice Board
  const handlePublishNotice = async (lang: "bn" | "en") => {
    if (!currentMessId || !generatedNotice) return;
    setPublishingNotice(true);
    try {
      await api.postNotice(currentMessId, {
        title: lang === "bn" ? generatedNotice.title_bn : generatedNotice.title_en,
        body: lang === "bn" ? generatedNotice.body_bn : generatedNotice.body_en,
        is_pinned: Boolean(generatedNotice.suggested_pinned),
      });
      alert(`Notice published successfully in ${lang === "bn" ? "Bengali" : "English"}!`);
    } catch (err: any) {
      alert(err.message || "Failed to publish notice");
    } finally {
      setPublishingNotice(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <Sparkles className="h-6 w-6" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              AI & Advanced Analytics Studio
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Predictive budgeting, kitchen waste intelligence, occupancy forecasting, and bilingual AI generation.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto">
          {[
            { key: "budget", label: "Predictive Budget", icon: Flame },
            { key: "waste", label: "Waste & Kitchen", icon: UtensilsCrossed },
            { key: "occupancy", label: "Occupancy", icon: BedDouble },
            { key: "notice", label: "Bilingual AI Notice", icon: Languages },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all shrink-0 ${
                  active ? "bg-white text-purple-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
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
        <div className="py-20 text-center text-gray-400">Synthesizing predictive analytics...</div>
      ) : (
        <>
          {/* TAB 1: PREDICTIVE BUDGETING & BURN RATE (#45) */}
          {activeTab === "budget" && (
            <div className="space-y-8">
              {/* Burn Rate Hero Card */}
              <div className="bg-gradient-to-br from-gray-900 via-purple-950 to-indigo-950 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                  <div className="space-y-3 max-w-xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold uppercase tracking-wider">
                      <Flame className="h-3.5 w-3.5 text-amber-400" />
                      Live Daily Burn Rate Engine
                    </div>
                    <h2 className="text-3xl font-extrabold tracking-tight">
                      ৳{Number(budgetData?.daily_burn_rate ?? 0).toLocaleString()}
                      <span className="text-sm font-normal text-purple-200"> / day</span>
                    </h2>
                    <p className="text-purple-100 text-sm leading-relaxed">
                      At current grocery consumption, month-end expenses are projected at{" "}
                      <span className="font-bold text-amber-300">
                        ৳{Number(budgetData?.projected_month_end_expense ?? 0).toLocaleString()}
                      </span>
                      .
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center min-w-[200px]">
                    <span className="text-xs font-bold uppercase tracking-widest text-purple-200">
                      Projected / Resident
                    </span>
                    <span className="text-4xl font-black text-amber-300 mt-1">
                      ৳{Number(budgetData?.projected_cost_per_member ?? 0).toLocaleString()}
                    </span>
                    <span className="mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200">
                      {budgetData?.budget_status || "Healthy Burn Rate"}
                    </span>
                  </div>
                </div>

                {/* Progress tracker */}
                <div className="mt-8 pt-8 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <span className="text-xs text-purple-200 block">Spent So Far (Day {budgetData?.current_day}/{budgetData?.days_in_month})</span>
                    <span className="text-2xl font-bold">
                      ৳{Number(budgetData?.spent_so_far ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-purple-200 block">Days Remaining in Month</span>
                    <span className="text-2xl font-bold">{budgetData?.days_remaining ?? 0} days</span>
                  </div>
                  <div>
                    <span className="text-xs text-purple-200 block">Active Members Sharing Cost</span>
                    <span className="text-2xl font-bold">{budgetData?.active_members_count ?? 0} residents</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MEAL WASTE & KITCHEN INTELLIGENCE (#43) */}
          {activeTab === "waste" && (
            <div className="space-y-8">
              {/* Waste Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <span className="text-xs text-gray-500 font-medium block">Total Scheduled Meals</span>
                  <span className="text-2xl font-bold text-gray-900 mt-1 block">
                    {wasteData?.total_scheduled_meals ?? 0}
                  </span>
                  <span className="text-xs text-gray-400 mt-1 block">Current Month Roster</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <span className="text-xs text-gray-500 font-medium block">Checked-In / Redeemed</span>
                  <span className="text-2xl font-bold text-emerald-600 mt-1 block">
                    {wasteData?.checked_in_meals ?? 0}
                  </span>
                  <span className="text-xs text-emerald-700 mt-1 block">Verified via QR</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <span className="text-xs text-gray-500 font-medium block">Food Waste Rate</span>
                  <span className="text-2xl font-bold text-amber-600 mt-1 block">
                    {wasteData?.waste_rate_percentage ?? 4.5}%
                  </span>
                  <span className="text-xs text-amber-700 mt-1 block">
                    {wasteData?.waste_status || "Optimal"}
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <span className="text-xs text-gray-500 font-medium block">Effective Cost / Meal</span>
                  <span className="text-2xl font-bold text-indigo-600 mt-1 block">
                    ৳{wasteData?.effective_meal_rate ?? 0}
                  </span>
                  <span className="text-xs text-indigo-700 mt-1 block">Total Grocery / Meals</span>
                </div>
              </div>

              {/* Actionable Kitchen Insights */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  <h3 className="text-base font-bold text-gray-900">
                    AI Kitchen Efficiency & Procurement Insights
                  </h3>
                </div>
                <div className="space-y-3">
                  {wasteData?.recommendations?.map((rec: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700 leading-relaxed">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: OCCUPANCY & VACANCY DASHBOARD (#46) */}
          {activeTab === "occupancy" && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm text-center">
                  <span className="text-xs text-gray-500 font-medium">Occupancy Rate</span>
                  <div className="text-5xl font-black text-emerald-600 my-2">
                    {occupancyData?.occupancy_rate_percentage ?? 0}%
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                    {occupancyData?.health_rating || "Good Standing"}
                  </span>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-xs text-gray-500 font-medium">Bed Distribution</span>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-sm text-gray-600">Total Bed Capacity:</span>
                      <span className="text-base font-bold text-gray-900">{occupancyData?.total_beds ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm text-emerald-600">Occupied Beds:</span>
                      <span className="text-base font-bold text-emerald-700">{occupancyData?.occupied_beds ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm text-red-500">Vacant / Available:</span>
                      <span className="text-base font-bold text-red-600">{occupancyData?.empty_beds ?? 0}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-xs text-gray-500 font-medium">Financial Impact</span>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-sm text-gray-600">Current Monthly Rent:</span>
                      <span className="text-base font-bold text-gray-900">
                        ৳{Number(occupancyData?.current_monthly_revenue ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm text-gray-600">100% Capacity Potential:</span>
                      <span className="text-base font-bold text-emerald-700">
                        ৳{Number(occupancyData?.potential_full_revenue ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm text-red-500">Monthly Vacancy Loss:</span>
                      <span className="text-base font-bold text-red-600">
                        ৳{Number(occupancyData?.vacancy_revenue_loss ?? 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BILINGUAL AI NOTICE WRITER (#44) */}
          {activeTab === "notice" && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                    <Languages className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Bilingual AI Notice Drafter</h2>
                    <p className="text-xs text-gray-500">
                      Input your instructions or topic; AI will produce synchronized, respectful notices in both Bengali and English.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleGenerateNotice} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Notice Topic or Bullet Points *
                    </label>
                    <textarea
                      rows={3}
                      value={noticePrompt}
                      onChange={(e) => setNoticePrompt(e.target.value)}
                      placeholder="e.g. Water supply will be closed tomorrow 10am to 1pm for tank cleaning. Store water."
                      required
                      className="w-full text-sm border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">
                        Tone of Voice
                      </label>
                      <select
                        value={noticeTone}
                        onChange={(e) => setNoticeTone(e.target.value)}
                        className="w-full text-xs font-medium border border-gray-300 rounded-xl p-2.5"
                      >
                        <option value="formal">Formal & Authoritative</option>
                        <option value="friendly">Warm & Community Friendly</option>
                        <option value="urgent">Urgent & High Priority</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">
                        Category
                      </label>
                      <select
                        value={noticeCategory}
                        onChange={(e) => setNoticeCategory(e.target.value)}
                        className="w-full text-xs font-medium border border-gray-300 rounded-xl p-2.5"
                      >
                        <option value="general">General Notice</option>
                        <option value="utilities">Water & Electricity</option>
                        <option value="dining">Kitchen & Meal Cutoff</option>
                        <option value="rules">Curfew & Mess Rules</option>
                        <option value="celebration">Feast & Events</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={generatingNotice}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    {generatingNotice ? "Generating Bilingual Drafts..." : "Generate Notice in বাংলা & English"}
                  </button>
                </form>
              </div>

              {/* Generated Side-by-Side Previews */}
              {generatedNotice && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  {/* Bengali Draft */}
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                          বাংলা সংস্করণ (Bengali)
                        </span>
                        {generatedNotice.suggested_pinned && (
                          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                            Pinned
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-gray-900 text-base mb-2">
                        {generatedNotice.title_bn}
                      </h4>
                      <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                        {generatedNotice.body_bn}
                      </p>
                    </div>

                    <button
                      onClick={() => handlePublishNotice("bn")}
                      disabled={publishingNotice}
                      className="mt-6 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <Send className="h-3.5 w-3.5" />
                      বাংলায় নোটিশ বোর্ডে প্রকাশ করুন
                    </button>
                  </div>

                  {/* English Draft */}
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
                          English Version
                        </span>
                        {generatedNotice.suggested_pinned && (
                          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                            Pinned
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-gray-900 text-base mb-2">
                        {generatedNotice.title_en}
                      </h4>
                      <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                        {generatedNotice.body_en}
                      </p>
                    </div>

                    <button
                      onClick={() => handlePublishNotice("en")}
                      disabled={publishingNotice}
                      className="mt-6 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Publish in English to Notice Board
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
