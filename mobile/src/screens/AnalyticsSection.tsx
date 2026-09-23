import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

export function AnalyticsSection() {
  const { currentMessId, currentResidency } = useAuth();
  const isManager = currentResidency?.role === "owner" || currentResidency?.role === "manager";

  const [activeTab, setActiveTab] = useState<"budget" | "waste" | "occupancy" | "ai_notice" | "scan">("budget");
  const [loading, setLoading] = useState(false);

  // #45 Predictive Budget
  const [budgetData, setBudgetData] = useState<any>(null);

  // #43 Financial & Waste
  const [wasteData, setWasteData] = useState<any>(null);

  // #46 Occupancy
  const [occupancyData, setOccupancyData] = useState<any>(null);

  // #44 Bilingual AI Notice
  const [noticePrompt, setNoticePrompt] = useState("");
  const [noticeTone, setNoticeTone] = useState("formal");
  const [noticeCategory, setNoticeCategory] = useState("general");
  const [generatingNotice, setGeneratingNotice] = useState(false);
  const [generatedNotice, setGeneratedNotice] = useState<any>(null);

  // #42 AI Memo Scanner
  const [scanText, setScanText] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  useEffect(() => {
    if (currentMessId) {
      loadData();
    }
  }, [currentMessId, activeTab]);

  const loadData = async () => {
    if (!currentMessId) return;
    setLoading(true);
    try {
      if (activeTab === "budget") {
        const res = await api.getPredictiveBudget(currentMessId).catch(() => null);
        if (res) setBudgetData(res);
      } else if (activeTab === "waste") {
        const res = await api.getFinancialAndWaste(currentMessId).catch(() => null);
        if (res) setWasteData(res);
      } else if (activeTab === "occupancy") {
        const res = await api.getOccupancyAnalytics(currentMessId).catch(() => null);
        if (res) setOccupancyData(res);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // Generate AI Notice (#44)
  const handleGenerateNotice = async () => {
    if (!currentMessId || !noticePrompt.trim()) {
      Alert.alert("Required", "Please enter notice topic or bullet points.");
      return;
    }
    setGeneratingNotice(true);
    try {
      const res = await api.generateAiNotice(currentMessId, {
        prompt: noticePrompt.trim(),
        tone: noticeTone,
        category: noticeCategory,
      });
      setGeneratedNotice(res.draft);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to generate notice.");
    } finally {
      setGeneratingNotice(false);
    }
  };

  // Publish Notice (#44)
  const handlePublishNotice = async (lang: "bn" | "en") => {
    if (!currentMessId || !generatedNotice) return;
    try {
      await api.postNotice(currentMessId, {
        title: lang === "bn" ? generatedNotice.title_bn : generatedNotice.title_en,
        body: lang === "bn" ? generatedNotice.body_bn : generatedNotice.body_en,
        is_pinned: Boolean(generatedNotice.suggested_pinned),
      });
      Alert.alert("Published!", `Notice published in ${lang === "bn" ? "Bengali" : "English"}!`);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to publish notice.");
    }
  };

  // AI OCR Scan (#42)
  const handleScanReceipt = async () => {
    if (!currentMessId) return;
    setScanning(true);
    try {
      const res = await api.scanReceipt(currentMessId, {
        raw_text: scanText.trim() || undefined,
      });
      setScanResult(res);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to scan receipt.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Sub-tab navigation */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {[
          { key: "budget", label: "Burn Rate", icon: "flame-outline" },
          { key: "waste", label: "Food Waste", icon: "restaurant-outline" },
          { key: "occupancy", label: "Occupancy", icon: "bed-outline" },
          { key: "ai_notice", label: "AI Notice", icon: "language-outline" },
          { key: "scan", label: "AI Memo Scan", icon: "scan-outline" },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Ionicons
              name={tab.icon as any}
              size={15}
              color={activeTab === tab.key ? "#7c3aed" : "#6b7280"}
            />
            <Text style={[styles.tabBtnText, activeTab === tab.key && styles.tabBtnTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color="#7c3aed" style={{ marginVertical: 30 }} />
      ) : (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* TAB 1: PREDICTIVE BUDGET (#45) */}
          {activeTab === "budget" && (
            <View style={styles.sectionWrap}>
              <View style={styles.heroCard}>
                <View style={styles.heroIconBadge}>
                  <Ionicons name="flame" size={28} color="#f59e0b" />
                </View>
                <Text style={styles.heroTitle}>Daily Burn Rate</Text>
                <Text style={styles.burnRateBig}>
                  ৳{Number(budgetData?.daily_burn_rate ?? 0).toLocaleString()}
                  <Text style={styles.burnRateSub}> / day</Text>
                </Text>
                <Text style={styles.heroDesc}>
                  Projected Month-End Expenses: ৳{Number(budgetData?.projected_month_end_expense ?? 0).toLocaleString()}
                </Text>

                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>
                    {budgetData?.budget_status || "Healthy Burn Rate"}
                  </Text>
                </View>
              </View>

              <View style={styles.metricGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Spent Month-to-Date</Text>
                  <Text style={styles.metricVal}>৳{Number(budgetData?.spent_so_far ?? 0).toLocaleString()}</Text>
                  <Text style={styles.metricSub}>Day {budgetData?.current_day}/{budgetData?.days_in_month}</Text>
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Projected / Resident</Text>
                  <Text style={[styles.metricVal, { color: "#7c3aed" }]}>
                    ৳{Number(budgetData?.projected_cost_per_member ?? 0).toLocaleString()}
                  </Text>
                  <Text style={styles.metricSub}>{budgetData?.active_members_count ?? 0} members</Text>
                </View>
              </View>
            </View>
          )}

          {/* TAB 2: FOOD WASTE & KITCHEN INTELLIGENCE (#43) */}
          {activeTab === "waste" && (
            <View style={styles.sectionWrap}>
              <View style={styles.metricGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Scheduled Meals</Text>
                  <Text style={styles.metricVal}>{wasteData?.total_scheduled_meals ?? 0}</Text>
                  <Text style={styles.metricSub}>Monthly total</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Checked-In via QR</Text>
                  <Text style={[styles.metricVal, { color: "#059669" }]}>
                    {wasteData?.checked_in_meals ?? 0}
                  </Text>
                  <Text style={styles.metricSub}>Redeemed meals</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Food Waste Rate</Text>
                  <Text style={[styles.metricVal, { color: "#d97706" }]}>
                    {wasteData?.waste_rate_percentage ?? 4.5}%
                  </Text>
                  <Text style={styles.metricSub}>{wasteData?.waste_status || "Optimal"}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Effective Meal Rate</Text>
                  <Text style={[styles.metricVal, { color: "#2563eb" }]}>
                    ৳{wasteData?.effective_meal_rate ?? 0}
                  </Text>
                  <Text style={styles.metricSub}>Per meal cost</Text>
                </View>
              </View>

              <Text style={styles.sectionHeading}>Kitchen Recommendations</Text>
              {wasteData?.recommendations?.map((rec: string, i: number) => (
                <View key={i} style={styles.recCard}>
                  <Ionicons name="checkmark-circle" size={18} color="#059669" />
                  <Text style={styles.recText}>{rec}</Text>
                </View>
              ))}
            </View>
          )}

          {/* TAB 3: OCCUPANCY ANALYTICS (#46) */}
          {activeTab === "occupancy" && (
            <View style={styles.sectionWrap}>
              <View style={styles.occupancyHero}>
                <Text style={styles.occRateBig}>
                  {occupancyData?.occupancy_rate_percentage ?? 0}%
                </Text>
                <Text style={styles.occRateLabel}>Current Mess Occupancy</Text>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>
                    {occupancyData?.health_rating || "Good Standing"}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBox}>
                <View style={styles.rowBetween}>
                  <Text style={styles.boxLabel}>Total Bed Capacity</Text>
                  <Text style={styles.boxVal}>{occupancyData?.total_beds ?? 0}</Text>
                </View>
                <View style={styles.rowBetween}>
                  <Text style={styles.boxLabel}>Occupied Beds</Text>
                  <Text style={[styles.boxVal, { color: "#059669" }]}>
                    {occupancyData?.occupied_beds ?? 0}
                  </Text>
                </View>
                <View style={styles.rowBetween}>
                  <Text style={styles.boxLabel}>Vacant Beds</Text>
                  <Text style={[styles.boxVal, { color: "#dc2626" }]}>
                    {occupancyData?.empty_beds ?? 0}
                  </Text>
                </View>
                <View style={styles.rowBetween}>
                  <Text style={styles.boxLabel}>Current Monthly Rent</Text>
                  <Text style={styles.boxVal}>
                    ৳{Number(occupancyData?.current_monthly_revenue ?? 0).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.rowBetween}>
                  <Text style={styles.boxLabel}>Potential 100% Revenue</Text>
                  <Text style={[styles.boxVal, { color: "#059669" }]}>
                    ৳{Number(occupancyData?.potential_full_revenue ?? 0).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.rowBetween}>
                  <Text style={styles.boxLabel}>Vacancy Revenue Loss</Text>
                  <Text style={[styles.boxVal, { color: "#dc2626" }]}>
                    ৳{Number(occupancyData?.vacancy_revenue_loss ?? 0).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* TAB 4: BILINGUAL AI NOTICE WRITER (#44) */}
          {activeTab === "ai_notice" && (
            <View style={styles.sectionWrap}>
              <View style={styles.cardBox}>
                <Text style={styles.cardTitle}>Bilingual AI Notice Drafter</Text>
                <Text style={styles.cardSub}>
                  Enter bullet points or instruction to draft in both বাংলা and English.
                </Text>

                <TextInput
                  style={styles.textAreaInput}
                  multiline
                  numberOfLines={3}
                  placeholder="e.g. Water tank cleaning tomorrow morning 10am to 1pm. Please store water."
                  value={noticePrompt}
                  onChangeText={setNoticePrompt}
                />

                <TouchableOpacity
                  style={[styles.actionBtn, generatingNotice && { opacity: 0.7 }]}
                  onPress={handleGenerateNotice}
                  disabled={generatingNotice}
                >
                  {generatingNotice ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={16} color="#ffffff" />
                      <Text style={styles.actionBtnText}>Generate Notice (বাংলা & EN)</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {generatedNotice && (
                <View style={styles.draftsWrap}>
                  {/* Bengali Draft */}
                  <View style={styles.draftCard}>
                    <View style={styles.draftTag}>
                      <Text style={styles.draftTagText}>বাংলা সংস্করণ (Bengali)</Text>
                    </View>
                    <Text style={styles.draftTitle}>{generatedNotice.title_bn}</Text>
                    <Text style={styles.draftBody}>{generatedNotice.body_bn}</Text>
                    <TouchableOpacity
                      style={styles.publishBtn}
                      onPress={() => handlePublishNotice("bn")}
                    >
                      <Ionicons name="send" size={14} color="#ffffff" />
                      <Text style={styles.publishBtnText}>বাংলায় পোস্ট করুন</Text>
                    </TouchableOpacity>
                  </View>

                  {/* English Draft */}
                  <View style={styles.draftCard}>
                    <View style={[styles.draftTag, { backgroundColor: "#eff6ff" }]}>
                      <Text style={[styles.draftTagText, { color: "#2563eb" }]}>English Version</Text>
                    </View>
                    <Text style={styles.draftTitle}>{generatedNotice.title_en}</Text>
                    <Text style={styles.draftBody}>{generatedNotice.body_en}</Text>
                    <TouchableOpacity
                      style={[styles.publishBtn, { backgroundColor: "#2563eb" }]}
                      onPress={() => handlePublishNotice("en")}
                    >
                      <Ionicons name="send" size={14} color="#ffffff" />
                      <Text style={styles.publishBtnText}>Publish in English</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* TAB 5: AI MEMO SCANNER (#42) */}
          {activeTab === "scan" && (
            <View style={styles.sectionWrap}>
              <View style={styles.cardBox}>
                <Text style={styles.cardTitle}>AI Handwritten Receipt Scanner</Text>
                <Text style={styles.cardSub}>
                  Paste or input bazar receipt lines to detect items, quantities, and prices.
                </Text>

                <TouchableOpacity
                  style={styles.loadDemoBtn}
                  onPress={() =>
                    setScanText(
                      "চাল (Miniket Rice) 25kg 1750\nসয়াবিন তেল (Soybean Oil) 5L 900\nডিম (Eggs) 4 dozen 600\nমুরগি (Chicken) 2kg 440"
                    )
                  }
                >
                  <Text style={styles.loadDemoText}>Load Demo Bazar Receipt</Text>
                </TouchableOpacity>

                <TextInput
                  style={styles.textAreaInput}
                  multiline
                  numberOfLines={4}
                  placeholder="চাল 10kg 650&#10;আলু 5kg 200..."
                  value={scanText}
                  onChangeText={setScanText}
                />

                <TouchableOpacity
                  style={[styles.actionBtn, scanning && { opacity: 0.7 }]}
                  onPress={handleScanReceipt}
                  disabled={scanning}
                >
                  {scanning ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="scan" size={16} color="#ffffff" />
                      <Text style={styles.actionBtnText}>Scan & Extract Items</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {scanResult && (
                <View style={styles.cardBox}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardTitle}>Extracted Items ({scanResult.items_detected})</Text>
                    <Text style={[styles.boxVal, { color: "#7c3aed" }]}>
                      Total: ৳{scanResult.total_amount}
                    </Text>
                  </View>

                  <View style={{ marginTop: 10 }}>
                    {scanResult.items?.map((item: any, idx: number) => (
                      <View key={idx} style={styles.scanItemRow}>
                        <Text style={styles.scanItemName}>
                          {item.item_name} <Text style={{ color: "#9ca3af" }}>({item.quantity})</Text>
                        </Text>
                        <Text style={styles.scanItemPrice}>৳{item.amount}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  tabBar: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    marginRight: 8,
    gap: 5,
  },
  tabBtnActive: {
    backgroundColor: "#f5f3ff",
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4b5563",
  },
  tabBtnTextActive: {
    color: "#7c3aed",
    fontWeight: "700",
  },
  scrollContent: {
    padding: 16,
  },
  sectionWrap: {
    gap: 14,
  },
  heroCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  heroIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  burnRateBig: {
    fontSize: 34,
    fontWeight: "900",
    color: "#111827",
  },
  burnRateSub: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  heroDesc: {
    fontSize: 12,
    color: "#4b5563",
    marginTop: 4,
  },
  statusPill: {
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 10,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  metricLabel: {
    fontSize: 11,
    color: "#6b7280",
  },
  metricVal: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginTop: 2,
  },
  metricSub: {
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginTop: 6,
  },
  recCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 8,
  },
  recText: {
    fontSize: 12,
    color: "#374151",
    flex: 1,
    lineHeight: 18,
  },
  occupancyHero: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  occRateBig: {
    fontSize: 44,
    fontWeight: "900",
    color: "#059669",
  },
  occRateLabel: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "600",
  },
  cardBox: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  cardSub: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
    marginBottom: 10,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  boxLabel: {
    fontSize: 12,
    color: "#4b5563",
  },
  boxVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  textAreaInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    textAlignVertical: "top",
    color: "#111827",
    marginBottom: 10,
  },
  actionBtn: {
    backgroundColor: "#7c3aed",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  actionBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  draftsWrap: {
    gap: 12,
  },
  draftCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  draftTag: {
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  draftTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  draftTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  draftBody: {
    fontSize: 12,
    color: "#374151",
    lineHeight: 18,
    marginBottom: 12,
  },
  publishBtn: {
    backgroundColor: "#059669",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  publishBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  loadDemoBtn: {
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  loadDemoText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7c3aed",
  },
  scanItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  scanItemName: {
    fontSize: 12,
    color: "#111827",
  },
  scanItemPrice: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
});
