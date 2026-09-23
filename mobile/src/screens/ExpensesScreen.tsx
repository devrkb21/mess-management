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
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

type ExpenseTab = "roster" | "log" | "fixed" | "ledger" | "settlement";

export function ExpensesScreen() {
  const { currentMessId, currentResidency, user } = useAuth();
  const isManager = currentResidency?.role === "owner" || currentResidency?.role === "manager";
  const todayStr = new Date().toISOString().split("T")[0];

  const [activeTab, setActiveTab] = useState<ExpenseTab>("roster");
  const [selectedMonth, setSelectedMonth] = useState(() =>
    new Date().toISOString().substring(0, 7)
  );

  const [expenses, setExpenses] = useState<any[]>([]);
  const [totalExpense, setTotalExpense] = useState(0);
  const [bazarSchedules, setBazarSchedules] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [settlementsData, setSettlementsData] = useState<any>(null);

  // Log Bazar Form State
  const [bazarDate, setBazarDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [bazarAmount, setBazarAmount] = useState("");
  const [bazarDesc, setBazarDesc] = useState("");
  const [bazarReceiptUrl, setBazarReceiptUrl] = useState("");

  // Assign Duty Modal State
  const [assignModal, setAssignModal] = useState(false);
  const [assignDate, setAssignDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [assignResidencyId, setAssignResidencyId] = useState("");
  const [assignNotes, setAssignNotes] = useState("");

  // Fixed Bill Form State
  const [fixedTitle, setFixedTitle] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [fixedSplitMethod, setFixedSplitMethod] = useState<"equal" | "prorated">("equal");

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Check if current user has duty today
  const hasDutyToday = bazarSchedules.some(
    (s) =>
      s.date?.startsWith(todayStr) &&
      (s.assigned_residency_id === currentResidency?.id ||
        s.assigned_residency?.user_id === user?.id ||
        s.assigned_residency?.user?.id === user?.id)
  );

  const canLogBazar = isManager || hasDutyToday;

  useEffect(() => {
    if (currentMessId) {
      loadData();
    }
  }, [currentMessId, selectedMonth]);

  const loadData = async () => {
    if (!currentMessId) return;
    setLoading(true);
    try {
      const [expRes, schedRes, settleRes] = await Promise.all([
        api.getExpenses(currentMessId, selectedMonth),
        api.getBazarSchedules(currentMessId, selectedMonth),
        api.getSettlements(currentMessId, selectedMonth).catch(() => null),
      ]);
      setExpenses(expRes.expenses || []);
      setTotalExpense(expRes.total || 0);
      setBazarSchedules(schedRes.schedules || []);
      if (settleRes) setSettlementsData(settleRes);

      if (isManager) {
        const resRes = await api.getResidents(currentMessId);
        const activeOnly = (resRes.residents || []).filter((r: any) => r.status === "active");
        setResidents(activeOnly);
        if (activeOnly.length > 0 && !assignResidencyId) {
          setAssignResidencyId(activeOnly[0].id);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAddBazar = async () => {
    if (!currentMessId || !bazarAmount || !bazarDesc) {
      Alert.alert("Required", "Please enter amount and grocery description.");
      return;
    }
    setLoading(true);
    try {
      await api.logExpense(currentMessId, {
        date: bazarDate,
        amount: parseFloat(bazarAmount),
        description: bazarDesc,
        receipt_photo_url: bazarReceiptUrl || null,
      });
      Alert.alert("Success", "Bazar expense recorded! Live meal rate recalculated.");
      setBazarAmount("");
      setBazarDesc("");
      setBazarReceiptUrl("");
      loadData();
      setActiveTab("ledger");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to log expense.");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignBazar = async () => {
    if (!currentMessId || !assignResidencyId || !assignDate) {
      Alert.alert("Required", "Please select date and resident.");
      return;
    }
    setLoading(true);
    try {
      await api.assignBazarSchedule(currentMessId, {
        residency_id: assignResidencyId,
        date: assignDate,
        notes: assignNotes || null,
      });
      Alert.alert("Success", "Bazar duty assigned successfully!");
      setAssignModal(false);
      setAssignNotes("");
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to assign duty.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    Alert.alert("Remove Assignment", "Are you sure you want to remove this duty?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteBazarSchedule(scheduleId);
            loadData();
          } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to delete schedule.");
          }
        },
      },
    ]);
  };

  const handleAddFixedBill = async () => {
    if (!currentMessId || !fixedTitle || !fixedAmount) {
      Alert.alert("Required", "Please enter bill title and amount.");
      return;
    }
    setLoading(true);
    try {
      await api.addFixedBill(currentMessId, {
        title: fixedTitle,
        amount: parseFloat(fixedAmount),
        billing_month: selectedMonth,
        split_method: fixedSplitMethod,
      });
      Alert.alert("Success", `Fixed bill added for ${selectedMonth}!`);
      setFixedTitle("");
      setFixedAmount("");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to add fixed bill.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Duty Notification Banner for resident */}
      {hasDutyToday && (
        <View style={styles.dutyBanner}>
          <View style={styles.dutyBannerLeft}>
            <View style={styles.dutyIconBadge}>
              <Ionicons name="cart" size={20} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dutyBannerTitle}>You have Bazar Duty Today!</Text>
              <Text style={styles.dutyBannerSub}>
                আজ আপনার বাজার দায়িত্ব। আপনি আজকের বাজার খরচ এন্ট্রি করতে পারবেন।
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Segmented Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.segmentScroll}>
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentButton, activeTab === "roster" && styles.segmentButtonActive]}
            onPress={() => setActiveTab("roster")}
          >
            <Text style={[styles.segmentText, activeTab === "roster" && styles.segmentTextActive]}>
              Roster ({bazarSchedules.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentButton, activeTab === "log" && styles.segmentButtonActive]}
            onPress={() => setActiveTab("log")}
          >
            <Text style={[styles.segmentText, activeTab === "log" && styles.segmentTextActive]}>
              Log Bazar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentButton, activeTab === "fixed" && styles.segmentButtonActive]}
            onPress={() => setActiveTab("fixed")}
          >
            <Text style={[styles.segmentText, activeTab === "fixed" && styles.segmentTextActive]}>
              Fixed Bills
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentButton, activeTab === "ledger" && styles.segmentButtonActive]}
            onPress={() => setActiveTab("ledger")}
          >
            <Text style={[styles.segmentText, activeTab === "ledger" && styles.segmentTextActive]}>
              Ledger
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentButton, activeTab === "settlement" && styles.segmentButtonActive]}
            onPress={() => setActiveTab("settlement")}
          >
            <Text style={[styles.segmentText, activeTab === "settlement" && styles.segmentTextActive]}>
              Settlements
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* TAB 1: ROSTER */}
      {activeTab === "roster" && (
        <View style={styles.tabSection}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Bazar Duty Roster (বাজারের তালিকা)</Text>
              <Text style={styles.sectionSub}>Scheduled market shoppers for {selectedMonth}</Text>
            </View>

            {isManager && (
              <TouchableOpacity
                style={styles.actionHeaderBtn}
                onPress={() => setAssignModal(true)}
              >
                <Ionicons name="add" size={16} color="#ffffff" />
                <Text style={styles.actionHeaderBtnText}>Assign</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#059669" style={{ marginVertical: 30 }} />
          ) : bazarSchedules.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={40} color="#9ca3af" />
              <Text style={styles.emptyTitle}>No Duty Scheduled</Text>
              <Text style={styles.emptySub}>Manager can assign bazar duties to residents.</Text>
            </View>
          ) : (
            <View style={styles.cardList}>
              {bazarSchedules.map((item) => {
                const isItemToday = item.date?.startsWith(todayStr);
                return (
                  <View
                    key={item.id}
                    style={[styles.rosterCard, isItemToday && styles.rosterCardToday]}
                  >
                    <View style={styles.rosterCardHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={styles.rosterDate}>
                            {new Date(item.date).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </Text>
                          {isItemToday && (
                            <View style={styles.todayPill}>
                              <Text style={styles.todayPillText}>TODAY</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.rosterName}>
                          {item.assigned_residency?.user?.name || "Resident"}
                        </Text>
                        <Text style={styles.rosterPhone}>
                          📞 {item.assigned_residency?.user?.phone || "No phone"}
                        </Text>
                      </View>

                      {isManager && (
                        <TouchableOpacity
                          style={styles.deleteDutyBtn}
                          onPress={() => handleDeleteSchedule(item.id)}
                        >
                          <Ionicons name="trash-outline" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {item.notes && <Text style={styles.rosterNotes}>Notes: {item.notes}</Text>}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* TAB 2: LOG DAILY BAZAR */}
      {activeTab === "log" && (
        <View style={styles.tabSection}>
          <View style={styles.logCard}>
            <View style={styles.logHeader}>
              <View style={styles.logIcon}>
                <Ionicons name="bag-handle" size={22} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Log Daily Bazar Expense</Text>
                <Text style={styles.sectionSub}>
                  Divided by today's total meals to calculate live meal rate.
                </Text>
              </View>
            </View>

            {canLogBazar ? (
              <View style={styles.formContainer}>
                <Text style={styles.inputLabel}>Bazar Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={bazarDate}
                  onChangeText={setBazarDate}
                />

                <Text style={styles.inputLabel}>Amount (BDT)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 650"
                  value={bazarAmount}
                  onChangeText={setBazarAmount}
                  keyboardType="numeric"
                />

                <Text style={styles.inputLabel}>Items Description</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Fish, rice, vegetables, spices..."
                  value={bazarDesc}
                  onChangeText={setBazarDesc}
                />

                <Text style={styles.inputLabel}>Receipt Photo URL (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://... photo link"
                  value={bazarReceiptUrl}
                  onChangeText={setBazarReceiptUrl}
                />

                <TouchableOpacity
                  style={styles.submitPrimaryBtn}
                  onPress={handleAddBazar}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.submitPrimaryText}>Record Bazar Expense</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.lockedBox}>
                <Ionicons name="lock-closed" size={36} color="#9ca3af" />
                <Text style={styles.lockedTitle}>Bazar Logging Restricted</Text>
                <Text style={styles.lockedSub}>
                  Only the Mess Manager or the resident assigned Bazar duty today can record
                  grocery expenses.
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* TAB 3: FIXED SHARED BILLS */}
      {activeTab === "fixed" && (
        <View style={styles.tabSection}>
          <View style={styles.logCard}>
            <View style={styles.logHeader}>
              <View style={[styles.logIcon, { backgroundColor: "#dbeafe" }]}>
                <Ionicons name="receipt" size={22} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Add Fixed Shared Bill</Text>
                <Text style={styles.sectionSub}>
                  Shared costs (Cook, WiFi, Electricity, Maid) split among all residents.
                </Text>
              </View>
            </View>

            {isManager ? (
              <View style={styles.formContainer}>
                <Text style={styles.inputLabel}>Bill Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="WiFi, Electricity, Cook..."
                  value={fixedTitle}
                  onChangeText={setFixedTitle}
                />

                <Text style={styles.inputLabel}>Amount (BDT)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 1200"
                  value={fixedAmount}
                  onChangeText={setFixedAmount}
                  keyboardType="numeric"
                />

                <Text style={styles.inputLabel}>Split Method</Text>
                <View style={styles.splitToggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.splitBtn,
                      fixedSplitMethod === "equal" && styles.splitBtnActive,
                    ]}
                    onPress={() => setFixedSplitMethod("equal")}
                  >
                    <Text
                      style={[
                        styles.splitBtnText,
                        fixedSplitMethod === "equal" && styles.splitBtnTextActive,
                      ]}
                    >
                      Equal Split
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.splitBtn,
                      fixedSplitMethod === "prorated" && styles.splitBtnActive,
                    ]}
                    onPress={() => setFixedSplitMethod("prorated")}
                  >
                    <Text
                      style={[
                        styles.splitBtnText,
                        fixedSplitMethod === "prorated" && styles.splitBtnTextActive,
                      ]}
                    >
                      Prorated Split
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.submitPrimaryBtn, { backgroundColor: "#2563eb" }]}
                  onPress={handleAddFixedBill}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.submitPrimaryText}>Add Shared Bill</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.lockedBox}>
                <Ionicons name="shield-checkmark-outline" size={36} color="#9ca3af" />
                <Text style={styles.lockedTitle}>Manager-Only Tool</Text>
                <Text style={styles.lockedSub}>
                  Only the mess manager can configure and add fixed monthly utility bills.
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* TAB 4: LEDGER */}
      {activeTab === "ledger" && (
        <View style={styles.tabSection}>
          <View style={styles.ledgerSummaryCard}>
            <Text style={styles.ledgerMonthText}>Monthly Grocery Total ({selectedMonth})</Text>
            <Text style={styles.ledgerTotalAmount}>৳{totalExpense.toFixed(2)}</Text>
          </View>

          {expenses.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="basket-outline" size={40} color="#9ca3af" />
              <Text style={styles.emptyTitle}>No Expenses Logged</Text>
              <Text style={styles.emptySub}>No grocery purchases recorded for this month.</Text>
            </View>
          ) : (
            <View style={styles.cardList}>
              {expenses.map((exp) => (
                <View key={exp.id} style={styles.expenseItemCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.expenseDesc}>{exp.description}</Text>
                    <Text style={styles.expenseMeta}>
                      {new Date(exp.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      • By: {exp.entered_by_user?.name || "Manager"}
                    </Text>
                  </View>

                  <Text style={styles.expenseAmount}>৳{Number(exp.amount).toFixed(2)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* TAB 5: SMART DEBT SETTLEMENT (SPLITWISE LOGIC) */}
      {activeTab === "settlement" && (
        <View style={styles.tabSection}>
          <View style={styles.settleBanner}>
            <View style={styles.settleBannerHeader}>
              <View style={styles.settleIconBadge}>
                <Ionicons name="swap-horizontal" size={22} color="#ffffff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settleBannerTitle}>Smart Debt Settlement (ঋণ নিষ্পত্তি)</Text>
                <Text style={styles.settleBannerSub}>
                  Splitwise greedy algorithm: minimum peer-to-peer transfers to settle all shared mess expenses.
                </Text>
              </View>
            </View>

            <View style={styles.settleStatsRow}>
              <View style={styles.settleStatItem}>
                <Text style={styles.settleStatLabel}>Bazar Spent</Text>
                <Text style={styles.settleStatValue}>
                  ৳{Number(settlementsData?.total_spent || 0).toFixed(0)}
                </Text>
              </View>
              <View style={styles.settleStatDivider} />
              <View style={styles.settleStatItem}>
                <Text style={styles.settleStatLabel}>Total Meals</Text>
                <Text style={styles.settleStatValue}>{settlementsData?.total_meals ?? 0}</Text>
              </View>
              <View style={styles.settleStatDivider} />
              <View style={styles.settleStatItem}>
                <Text style={styles.settleStatLabel}>Meal Rate</Text>
                <Text style={styles.settleStatValue}>
                  ৳{Number(settlementsData?.effective_meal_rate || 0).toFixed(1)}
                </Text>
              </View>
            </View>
          </View>

          {/* Minimum Transfers Roadmap */}
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Minimum Transfers Roadmap</Text>
              <Text style={styles.sectionSub}>
                Direct settlements required to clear all mutual dues:
              </Text>
            </View>
          </View>

          {!settlementsData?.transfers || settlementsData.transfers.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="checkmark-circle-outline" size={44} color="#059669" />
              <Text style={styles.emptyTitle}>All Debts Cleared!</Text>
              <Text style={styles.emptySub}>
                Every resident's balance is settled. No transfers needed for this month.
              </Text>
            </View>
          ) : (
            <View style={styles.cardList}>
              {settlementsData.transfers.map((t: any, idx: number) => (
                <View key={idx} style={styles.transferCard}>
                  <View style={styles.transferPartyCol}>
                    <View style={[styles.transferAvatar, { backgroundColor: "#fee2e2" }]}>
                      <Text style={[styles.transferAvatarText, { color: "#b91c1c" }]}>
                        {t.from_user?.charAt(0)?.toUpperCase() || "U"}
                      </Text>
                    </View>
                    <Text style={styles.transferName} numberOfLines={1}>
                      {t.from_user}
                    </Text>
                    <View style={styles.payerTag}>
                      <Text style={styles.payerTagText}>PAYS</Text>
                    </View>
                  </View>

                  <View style={styles.transferMidCol}>
                    <View style={styles.amountPill}>
                      <Text style={styles.transferAmountText}>
                        ৳{Number(t.amount).toFixed(2)}
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={18} color="#059669" />
                  </View>

                  <View style={styles.transferPartyCol}>
                    <View style={[styles.transferAvatar, { backgroundColor: "#d1fae5" }]}>
                      <Text style={[styles.transferAvatarText, { color: "#065f46" }]}>
                        {t.to_user?.charAt(0)?.toUpperCase() || "U"}
                      </Text>
                    </View>
                    <Text style={styles.transferName} numberOfLines={1}>
                      {t.to_user}
                    </Text>
                    <View style={styles.receiverTag}>
                      <Text style={styles.receiverTagText}>RECEIVES</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Individual Net Balances */}
          <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
            <View>
              <Text style={styles.sectionTitle}>Net Individual Balances</Text>
              <Text style={styles.sectionSub}>Calculated based on meals eaten vs groceries paid:</Text>
            </View>
          </View>

          <View style={styles.cardList}>
            {(settlementsData?.balances || []).map((b: any, idx: number) => {
              const net = Number(b.net_balance || 0);
              const isCreditor = net > 0.01;
              const isDebtor = net < -0.01;

              return (
                <View key={b.residency_id || idx} style={styles.balanceCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.balanceName}>{b.user_name}</Text>
                    <Text style={styles.balanceBreakdown}>
                      Spent: ৳{Number(b.spent || 0).toFixed(0)} • Fair Share: ৳{Number(b.share || 0).toFixed(0)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.netBadge,
                      isCreditor
                        ? styles.netBadgeCreditor
                        : isDebtor
                        ? styles.netBadgeDebtor
                        : styles.netBadgeSettled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.netBadgeText,
                        isCreditor
                          ? styles.netTextCreditor
                          : isDebtor
                          ? styles.netTextDebtor
                          : styles.netTextSettled,
                      ]}
                    >
                      {isCreditor
                        ? `+৳${net.toFixed(2)} (To Receive)`
                        : isDebtor
                        ? `-৳${Math.abs(net).toFixed(2)} (Owes)`
                        : "৳0.00 (Settled)"}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Assign Duty Modal */}
      <Modal visible={assignModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Bazar Duty</Text>
              <TouchableOpacity onPress={() => setAssignModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Assign a resident for market duty on a specific date.
            </Text>

            <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              value={assignDate}
              onChangeText={setAssignDate}
            />

            <Text style={styles.inputLabel}>Select Resident</Text>
            <ScrollView style={{ maxHeight: 140, marginVertical: 6 }}>
              {residents.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.residentOption,
                    assignResidencyId === r.id && styles.residentOptionActive,
                  ]}
                  onPress={() => setAssignResidencyId(r.id)}
                >
                  <Text
                    style={[
                      styles.residentOptionText,
                      assignResidencyId === r.id && styles.residentOptionTextActive,
                    ]}
                  >
                    {r.user?.name || "Resident"} ({r.bed?.label || "Unassigned Bed"})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Notes / Shopping List (Optional)</Text>
            <TextInput
              style={[styles.modalInput, { height: 60 }]}
              placeholder="e.g. 5kg rice, fresh fish, onions..."
              value={assignNotes}
              onChangeText={setAssignNotes}
              multiline
            />

            <TouchableOpacity
              style={styles.modalSubmitButton}
              onPress={handleAssignBazar}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.modalSubmitText}>Confirm Assignment</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  dutyBanner: {
    backgroundColor: "#059669",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  dutyBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dutyIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  dutyBannerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
  },
  dutyBannerSub: {
    fontSize: 11,
    color: "#d1fae5",
    marginTop: 2,
  },
  segmentScroll: {
    marginBottom: 16,
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#e5e7eb",
    borderRadius: 14,
    padding: 3,
  },
  segmentButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    borderRadius: 12,
  },
  segmentButtonActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4b5563",
  },
  segmentTextActive: {
    color: "#065f46",
    fontWeight: "800",
  },
  tabSection: {
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  sectionSub: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  actionHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#059669",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionHeaderBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  cardList: {
    gap: 10,
  },
  rosterCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  rosterCardToday: {
    borderColor: "#a7f3d0",
    backgroundColor: "#f0fdf4",
  },
  rosterCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  rosterDate: {
    fontSize: 13,
    fontWeight: "700",
    color: "#059669",
  },
  todayPill: {
    backgroundColor: "#059669",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  todayPillText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "800",
  },
  rosterName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginTop: 2,
  },
  rosterPhone: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  deleteDutyBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
  },
  rosterNotes: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#4b5563",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  logCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  logHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  logIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
  },
  formContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginTop: 6,
  },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  submitPrimaryBtn: {
    backgroundColor: "#059669",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 14,
  },
  submitPrimaryText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  splitToggleRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  splitBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  splitBtnActive: {
    backgroundColor: "#dbeafe",
    borderColor: "#3b82f6",
  },
  splitBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4b5563",
  },
  splitBtnTextActive: {
    color: "#1d4ed8",
    fontWeight: "700",
  },
  lockedBox: {
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  lockedTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#374151",
    marginTop: 8,
  },
  lockedSub: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 4,
  },
  ledgerSummaryCard: {
    backgroundColor: "#ecfdf5",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  ledgerMonthText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#065f46",
    textTransform: "uppercase",
  },
  ledgerTotalAmount: {
    fontSize: 28,
    fontWeight: "900",
    color: "#065f46",
    marginTop: 4,
  },
  expenseItemCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  expenseDesc: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  expenseMeta: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  modalDesc: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 14,
  },
  modalInput: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: "#111827",
  },
  modalSubmitButton: {
    backgroundColor: "#059669",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 18,
  },
  modalSubmitText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  residentOption: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 6,
    backgroundColor: "#f9fafb",
  },
  residentOptionActive: {
    borderColor: "#059669",
    backgroundColor: "#d1fae5",
  },
  residentOptionText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  residentOptionTextActive: {
    color: "#065f46",
    fontWeight: "700",
  },
  settleBanner: {
    backgroundColor: "#065f46",
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
  },
  settleBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settleIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  settleBannerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
  },
  settleBannerSub: {
    fontSize: 11,
    color: "#a7f3d0",
    marginTop: 2,
    lineHeight: 15,
  },
  settleStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: 14,
    paddingVertical: 10,
    marginTop: 14,
  },
  settleStatItem: {
    alignItems: "center",
  },
  settleStatLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#a7f3d0",
    textTransform: "uppercase",
  },
  settleStatValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#ffffff",
    marginTop: 2,
  },
  settleStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  transferCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  transferPartyCol: {
    alignItems: "center",
    width: 85,
  },
  transferAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  transferAvatarText: {
    fontSize: 15,
    fontWeight: "800",
  },
  transferName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  payerTag: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 3,
  },
  payerTagText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#b91c1c",
  },
  receiverTag: {
    backgroundColor: "#d1fae5",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 3,
  },
  receiverTagText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#065f46",
  },
  transferMidCol: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  amountPill: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  transferAmountText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#065f46",
  },
  balanceCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  balanceName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  balanceBreakdown: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  netBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  netBadgeCreditor: {
    backgroundColor: "#d1fae5",
  },
  netBadgeDebtor: {
    backgroundColor: "#fee2e2",
  },
  netBadgeSettled: {
    backgroundColor: "#f3f4f6",
  },
  netBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  netTextCreditor: {
    color: "#065f46",
  },
  netTextDebtor: {
    color: "#b91c1c",
  },
  netTextSettled: {
    color: "#6b7280",
  },
});
