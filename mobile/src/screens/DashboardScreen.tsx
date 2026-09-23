import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

export function DashboardScreen() {
  const { currentMessId, currentResidency, user, setCurrentMessId } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (currentMessId) {
      loadDashboard();
    } else {
      setLoading(false);
    }
  }, [currentMessId]);

  const loadDashboard = async () => {
    if (!currentMessId) return;
    try {
      const res = await api.getDashboard(currentMessId);
      setData(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const today = data?.today_breakdown;
  const bazarShoppers = today?.bazar_shoppers || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Mess Info Header */}
      <View style={styles.messHeader}>
        <View style={styles.messHeaderLeft}>
          <Text style={styles.messName}>{currentResidency?.mess?.name || "My Mess"}</Text>
          <Text style={styles.messMeta}>
            Role: <Text style={styles.boldText}>{currentResidency?.role?.toUpperCase()}</Text>
            {currentResidency?.bed && ` • Bed: ${currentResidency.bed.label}`}
          </Text>
        </View>

        {user && (user.residencies?.length ?? 0) > 1 && (
          <View style={styles.messSwitchSection}>
            <Text style={styles.switchLabel}>Messes:</Text>
            {user.residencies?.map((r) => (
              <TouchableOpacity
                key={r.mess_id}
                style={[
                  styles.switchChip,
                  r.mess_id === currentMessId && styles.switchChipActive,
                ]}
                onPress={() => setCurrentMessId(r.mess_id)}
              >
                <Text
                  style={[
                    styles.switchChipText,
                    r.mess_id === currentMessId && styles.switchChipTextActive,
                  ]}
                >
                  {r.mess?.name || "Mess"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#059669" style={{ marginVertical: 40 }} />
      ) : (
        <>
          {/* Today's Meals Live Headcount Board */}
          <View style={styles.boardCard}>
            <View style={styles.boardHeader}>
              <View style={styles.pulseDot} />
              <Text style={styles.boardTitle}>Today's Meals Headcount (আজকের মিল)</Text>
            </View>

            <View style={styles.mealGrid}>
              <View style={[styles.mealGridItem, { backgroundColor: "#fef3c7" }]}>
                <Text style={[styles.gridLabel, { color: "#b45309" }]}>Breakfast</Text>
                <Text style={styles.gridCount}>{today?.breakfast?.total ?? 0}</Text>
                <Text style={styles.gridSub}>
                  {today?.breakfast?.count ?? 0} res
                  {(today?.breakfast?.guests ?? 0) > 0 && ` +${today.breakfast.guests}g`}
                </Text>
              </View>

              <View style={[styles.mealGridItem, { backgroundColor: "#d1fae5" }]}>
                <Text style={[styles.gridLabel, { color: "#047857" }]}>Lunch</Text>
                <Text style={styles.gridCount}>{today?.lunch?.total ?? 0}</Text>
                <Text style={styles.gridSub}>
                  {today?.lunch?.count ?? 0} res
                  {(today?.lunch?.guests ?? 0) > 0 && ` +${today.lunch.guests}g`}
                </Text>
              </View>

              <View style={[styles.mealGridItem, { backgroundColor: "#e0e7ff" }]}>
                <Text style={[styles.gridLabel, { color: "#4338ca" }]}>Dinner</Text>
                <Text style={styles.gridCount}>{today?.dinner?.total ?? 0}</Text>
                <Text style={styles.gridSub}>
                  {today?.dinner?.count ?? 0} res
                  {(today?.dinner?.guests ?? 0) > 0 && ` +${today.dinner.guests}g`}
                </Text>
              </View>

              <View style={[styles.mealGridItem, { backgroundColor: "#f1f5f9" }]}>
                <Text style={[styles.gridLabel, { color: "#334155" }]}>Total Meals</Text>
                <Text style={[styles.gridCount, { color: "#0f172a" }]}>
                  {today?.total_meals ?? 0}
                </Text>
                <Text style={styles.gridSub}>servings today</Text>
              </View>
            </View>
          </View>

          {/* Today's Bazar Duty Shopper Card */}
          <View style={styles.bazarDutyCard}>
            <View style={styles.bazarDutyLeft}>
              <View style={styles.bazarIconBadge}>
                <Ionicons name="cart" size={22} color="#ffffff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bazarDutyTitle}>Today's Bazar Duty (বাজারের দায়িত্ব)</Text>
                {bazarShoppers.length > 0 ? (
                  <View style={{ marginTop: 2 }}>
                    {bazarShoppers.map((shopper: any, idx: number) => (
                      <Text key={shopper.id || idx} style={styles.bazarShopperName}>
                        {shopper.name || "Resident"}{" "}
                        {shopper.phone && (
                          <Text style={styles.bazarShopperPhone}>({shopper.phone})</Text>
                        )}
                      </Text>
                    ))}
                    <Text style={styles.bazarDutySub}>Assigned for today's market grocery</Text>
                  </View>
                ) : (
                  <Text style={styles.bazarDutyNone}>No resident assigned for today's market.</Text>
                )}
              </View>
            </View>
          </View>

          {/* Key Mess Stats 2x2 Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <View style={styles.statIconBadge}>
                <Ionicons name="people" size={16} color="#059669" />
              </View>
              <Text style={styles.statLabel}>Active Residents</Text>
              <Text style={styles.statValue}>{data?.active_residents ?? 0}</Text>
              <Text style={styles.statSub}>living in mess</Text>
            </View>

            <View style={styles.statBox}>
              <View style={[styles.statIconBadge, { backgroundColor: "#dbeafe" }]}>
                <Ionicons name="cart" size={16} color="#2563eb" />
              </View>
              <Text style={styles.statLabel}>Monthly Bazar</Text>
              <Text style={styles.statValue}>
                ৳{data?.monthly_expense_total ? Number(data.monthly_expense_total).toFixed(0) : "0"}
              </Text>
              <Text style={styles.statSub}>groceries total</Text>
            </View>

            <View style={styles.statBox}>
              <View style={[styles.statIconBadge, { backgroundColor: "#fef3c7" }]}>
                <Ionicons name="calculator" size={16} color="#d97706" />
              </View>
              <Text style={styles.statLabel}>Live Meal Rate</Text>
              <Text style={[styles.statValue, { color: "#d97706" }]}>
                ৳{data?.today?.per_meal_rate ? Number(data.today.per_meal_rate).toFixed(2) : "0.00"}
              </Text>
              <Text style={styles.statSub}>today's rate</Text>
            </View>

            <View style={styles.statBox}>
              <View style={[styles.statIconBadge, { backgroundColor: "#fee2e2" }]}>
                <Ionicons name="receipt" size={16} color="#dc2626" />
              </View>
              <Text style={styles.statLabel}>Pending Dues</Text>
              <Text style={[styles.statValue, { color: "#dc2626" }]}>
                ৳{data?.pending_dues ? Number(data.pending_dues).toFixed(0) : "0"}
              </Text>
              <Text style={styles.statSub}>unpaid balance</Text>
            </View>
          </View>

          {/* Open Complaints Alert Banner */}
          {Number(data?.open_complaints || 0) > 0 && (
            <View style={styles.complaintAlertBanner}>
              <Ionicons name="warning-outline" size={18} color="#b45309" />
              <Text style={styles.complaintAlertText}>
                {data.open_complaints} open maintenance complaint(s) reported in this mess.
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  messHeader: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 16,
  },
  messHeaderLeft: {
    marginBottom: 8,
  },
  messName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  messMeta: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
  },
  boldText: {
    fontWeight: "700",
    color: "#059669",
  },
  messSwitchSection: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  switchLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  switchChip: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  switchChipActive: {
    backgroundColor: "#d1fae5",
    borderWidth: 1,
    borderColor: "#10b981",
  },
  switchChipText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "600",
  },
  switchChipTextActive: {
    color: "#065f46",
    fontWeight: "700",
  },
  boardCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 16,
  },
  boardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10b981",
  },
  boardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  mealGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  mealGridItem: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 14,
    padding: 12,
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  gridCount: {
    fontSize: 26,
    fontWeight: "900",
    color: "#111827",
    marginTop: 4,
  },
  gridSub: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  bazarDutyCard: {
    backgroundColor: "#ecfdf5",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    marginBottom: 16,
  },
  bazarDutyLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bazarIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
  },
  bazarDutyTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#065f46",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  bazarShopperName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  bazarShopperPhone: {
    fontSize: 12,
    fontWeight: "500",
    color: "#4b5563",
  },
  bazarDutySub: {
    fontSize: 11,
    color: "#059669",
    marginTop: 2,
  },
  bazarDutyNone: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statBox: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  statIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    marginTop: 2,
  },
  statSub: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  complaintAlertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },
  complaintAlertText: {
    fontSize: 12,
    color: "#92400e",
    fontWeight: "600",
    flex: 1,
  },
});
