import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

type TabMode = "my" | "sheet" | "vacations";

export function MealsScreen() {
  const { currentResidency, currentMessId } = useAuth();
  const isManager = currentResidency?.role === "owner" || currentResidency?.role === "manager";

  const [activeTab, setActiveTab] = useState<TabMode>("my");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Personal Meals
  const [meals, setMeals] = useState<Record<string, { isOn: boolean; guestCount: number }>>({
    breakfast: { isOn: true, guestCount: 0 },
    lunch: { isOn: true, guestCount: 0 },
    dinner: { isOn: true, guestCount: 0 },
  });
  const [liveRate, setLiveRate] = useState<any>(null);

  // Collective Meal Sheet
  const [dailySheet, setDailySheet] = useState<any>(null);
  const [sheetLoading, setSheetLoading] = useState(false);

  // Vacations
  const [vacations, setVacations] = useState<any[]>([]);
  const [vacationModal, setVacationModal] = useState(false);
  const [vacationStart, setVacationStart] = useState("");
  const [vacationEnd, setVacationEnd] = useState("");
  const [vacationReason, setVacationReason] = useState("");
  const [vacationSubmitting, setVacationSubmitting] = useState(false);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (activeTab === "my") {
      loadDayMeals();
    } else if (activeTab === "sheet") {
      loadMessDailyMeals();
    } else if (activeTab === "vacations") {
      loadVacations();
    }
    if (currentMessId) {
      loadLiveRate();
    }
  }, [currentResidency, currentMessId, selectedDate, activeTab]);

  const loadDayMeals = async () => {
    if (!currentResidency?.id) return;
    setLoading(true);
    try {
      const month = selectedDate.substring(0, 7);
      const res = await api.getMealHistory(currentResidency.id, month);
      const dayLogs = (res.meals || []).filter((m: any) => m.date.startsWith(selectedDate));

      const nextMeals = {
        breakfast: { isOn: true, guestCount: 0 },
        lunch: { isOn: true, guestCount: 0 },
        dinner: { isOn: true, guestCount: 0 },
      };

      dayLogs.forEach((log: any) => {
        if (nextMeals[log.meal_type as keyof typeof nextMeals]) {
          nextMeals[log.meal_type as keyof typeof nextMeals] = {
            isOn: Boolean(log.is_on),
            guestCount: log.guest_count || 0,
          };
        }
      });
      setMeals(nextMeals);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMessDailyMeals = async () => {
    if (!currentMessId) return;
    setSheetLoading(true);
    try {
      const res = await api.getMessDailyMeals(currentMessId, selectedDate);
      setDailySheet(res);
    } catch {
      // ignore
    } finally {
      setSheetLoading(false);
      setRefreshing(false);
    }
  };

  const loadVacations = async () => {
    if (!currentMessId) return;
    try {
      const res = await api.getMessVacations(currentMessId);
      setVacations(res.vacations || []);
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  };

  const loadLiveRate = async () => {
    if (!currentMessId) return;
    try {
      const rate = await api.getLiveMealRate(currentMessId);
      setLiveRate(rate);
    } catch {
      // ignore
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === "my") loadDayMeals();
    else if (activeTab === "sheet") loadMessDailyMeals();
    else if (activeTab === "vacations") loadVacations();
    loadLiveRate();
  };

  const handleToggle = async (mealType: string, newIsOn: boolean) => {
    if (!currentResidency?.id) return;
    const currentGuest = meals[mealType]?.guestCount || 0;
    setMeals((prev) => ({
      ...prev,
      [mealType]: { isOn: newIsOn, guestCount: newIsOn ? currentGuest : 0 },
    }));

    try {
      await api.toggleMeal(currentResidency.id, {
        date: selectedDate,
        meal_type: mealType,
        is_on: newIsOn,
        guest_count: newIsOn ? currentGuest : 0,
      });
      loadLiveRate();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update meal.");
      setMeals((prev) => ({
        ...prev,
        [mealType]: { ...prev[mealType], isOn: !newIsOn },
      }));
    }
  };

  const handleGuestChange = async (mealType: string, delta: number) => {
    if (!currentResidency?.id) return;
    const current = meals[mealType];
    const newGuestCount = Math.max(0, current.guestCount + delta);

    setMeals((prev) => ({
      ...prev,
      [mealType]: { ...prev[mealType], guestCount: newGuestCount, isOn: true },
    }));

    try {
      await api.toggleMeal(currentResidency.id, {
        date: selectedDate,
        meal_type: mealType,
        is_on: true,
        guest_count: newGuestCount,
      });
      loadLiveRate();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update guest count.");
    }
  };

  // Manager toggles any resident's meal directly from collective sheet
  const handleManagerToggle = async (
    residencyId: string,
    mealType: string,
    currentIsOn: boolean,
    guestCount: number
  ) => {
    try {
      await api.toggleMeal(residencyId, {
        date: selectedDate,
        meal_type: mealType,
        is_on: !currentIsOn,
        guest_count: !currentIsOn ? guestCount : 0,
      });
      loadMessDailyMeals();
      loadLiveRate();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to toggle resident meal.");
    }
  };

  const handleApproveVacation = async (vacationId: string, status: "approved" | "rejected") => {
    try {
      await api.approveVacation(vacationId, status);
      Alert.alert("Success", `Vacation request ${status}.`);
      loadVacations();
    } catch (err: any) {
      Alert.alert("Error", err.message || `Failed to ${status} vacation.`);
    }
  };

  const handleVacationSubmit = async () => {
    if (!currentResidency?.id || !vacationStart || !vacationEnd) {
      Alert.alert("Required", "Please provide start and end dates.");
      return;
    }
    setVacationSubmitting(true);
    try {
      await api.submitVacation(currentResidency.id, {
        start_date: vacationStart,
        end_date: vacationEnd,
        reason: vacationReason,
      });
      Alert.alert("Success", "Vacation request submitted for manager approval.");
      setVacationModal(false);
      setVacationStart("");
      setVacationEnd("");
      setVacationReason("");
      loadVacations();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to submit vacation.");
    } finally {
      setVacationSubmitting(false);
    }
  };

  const changeDate = (daysDelta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + daysDelta);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const mealCards = [
    {
      type: "breakfast",
      title: "Breakfast (নাস্তা)",
      icon: "cafe-outline" as const,
      color: "#d97706",
      bgColor: "#fef3c7",
    },
    {
      type: "lunch",
      title: "Lunch (দুপুরের খাবার)",
      icon: "sunny-outline" as const,
      color: "#059669",
      bgColor: "#d1fae5",
    },
    {
      type: "dinner",
      title: "Dinner (রাতের খাবার)",
      icon: "moon-outline" as const,
      color: "#4f46e5",
      bgColor: "#e0e7ff",
    },
  ];

  const formattedDateString = new Date(selectedDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const getCutoffStatus = (mealType: string) => {
    const rawCutoff =
      dailySheet?.cutoffs?.[mealType] ||
      (currentResidency?.mess as any)?.[`meal_cutoff_${mealType}`] ||
      (mealType === "breakfast" ? "07:00" : mealType === "lunch" ? "11:00" : "18:00");
    const cutoffTime = rawCutoff.length === 5 ? rawCutoff + ":00" : rawCutoff;

    const targetDate = new Date(`${selectedDate}T${cutoffTime}`);
    const now = new Date();
    const isPast = targetDate.getTime() <= now.getTime();

    let timeLabel = "";
    if (!isPast) {
      const diffMs = targetDate.getTime() - now.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      if (hours > 0) {
        timeLabel = `Locks in ${hours}h ${mins}m`;
      } else {
        timeLabel = `Locks in ${mins}m`;
      }
    } else {
      timeLabel = "Cutoff passed";
    }

    return {
      cutoffTime: rawCutoff,
      isLocked: isPast && !isManager,
      isManagerOverride: isPast && isManager,
      isPast,
      timeLabel,
    };
  };

  const isToday = selectedDate === new Date().toISOString().split("T")[0];
  const pendingVacationsCount = vacations.filter((v) => v.status === "pending").length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Segmented Tab Bar */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentButton, activeTab === "my" && styles.segmentButtonActive]}
          onPress={() => setActiveTab("my")}
        >
          <Text style={[styles.segmentText, activeTab === "my" && styles.segmentTextActive]}>
            My Meals
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentButton, activeTab === "sheet" && styles.segmentButtonActive]}
          onPress={() => setActiveTab("sheet")}
        >
          <Text style={[styles.segmentText, activeTab === "sheet" && styles.segmentTextActive]}>
            Mess Sheet {dailySheet?.total_meals !== undefined && `(${dailySheet.total_meals})`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentButton, activeTab === "vacations" && styles.segmentButtonActive]}
          onPress={() => setActiveTab("vacations")}
        >
          <Text style={[styles.segmentText, activeTab === "vacations" && styles.segmentTextActive]}>
            Vacations {pendingVacationsCount > 0 && `(${pendingVacationsCount})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date Navigator */}
      <View style={styles.dateNavigator}>
        <TouchableOpacity style={styles.dateButton} onPress={() => changeDate(-1)}>
          <Ionicons name="chevron-back" size={20} color="#374151" />
        </TouchableOpacity>

        <View style={styles.dateDisplay}>
          <Text style={styles.dateText}>{formattedDateString}</Text>
          {isToday && <View style={styles.todayBadge}><Text style={styles.todayText}>TODAY</Text></View>}
        </View>

        <TouchableOpacity style={styles.dateButton} onPress={() => changeDate(1)}>
          <Ionicons name="chevron-forward" size={20} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* TAB 1: MY MEALS */}
      {activeTab === "my" && (
        <>
          {/* Live Rate Card */}
          <View style={styles.rateCard}>
            <View style={styles.rateLeft}>
              <Text style={styles.rateLabel}>LIVE MEAL RATE TODAY</Text>
              <Text style={styles.rateValue}>
                ৳{liveRate?.per_meal_rate ? Number(liveRate.per_meal_rate).toFixed(2) : "0.00"}
                <Text style={styles.rateUnit}> /meal</Text>
              </Text>
              <Text style={styles.rateSub}>
                Today: {liveRate?.total_meals || 0} meals • Bazar: ৳{liveRate?.total_expense || 0}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.vacationButton}
              onPress={() => setVacationModal(true)}
            >
              <Ionicons name="airplane-outline" size={16} color="#7c3aed" />
              <Text style={styles.vacationButtonText}>Vacation</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#059669" style={{ marginVertical: 40 }} />
          ) : (
            <View style={styles.mealList}>
              {mealCards.map((card) => {
                const current = meals[card.type] || { isOn: true, guestCount: 0 };
                const cutoff = getCutoffStatus(card.type);

                return (
                  <View
                    key={card.type}
                    style={[
                      styles.mealCard,
                      current.isOn ? styles.mealCardOn : styles.mealCardOff,
                      cutoff.isLocked && styles.mealCardLocked,
                    ]}
                  >
                    <View style={styles.mealCardHeader}>
                      <View style={styles.mealCardLeft}>
                        <View style={[styles.mealIcon, { backgroundColor: card.bgColor }]}>
                          <Ionicons name={card.icon} size={22} color={card.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.mealTitleRow}>
                            <Text style={styles.mealTitle}>{card.title}</Text>
                            {cutoff.isLocked ? (
                              <View style={styles.lockBadge}>
                                <Ionicons name="lock-closed" size={10} color="#b91c1c" />
                                <Text style={styles.lockBadgeText}>Locked ({cutoff.cutoffTime})</Text>
                              </View>
                            ) : cutoff.isManagerOverride ? (
                              <View style={styles.overrideBadge}>
                                <Ionicons name="flash" size={10} color="#6d28d9" />
                                <Text style={styles.overrideBadgeText}>Manager Override</Text>
                              </View>
                            ) : (
                              <View style={styles.countdownBadge}>
                                <Ionicons name="time-outline" size={10} color="#047857" />
                                <Text style={styles.countdownBadgeText}>{cutoff.timeLabel}</Text>
                              </View>
                            )}
                          </View>

                          <Text
                            style={[
                              styles.mealStatusText,
                              { color: current.isOn ? "#059669" : "#9ca3af" },
                            ]}
                          >
                            {current.isOn ? "MEAL ON (খাবেন)" : "MEAL OFF (খাবেন না)"}
                          </Text>
                        </View>
                      </View>

                      <Switch
                        trackColor={{ false: "#d1d5db", true: "#10b981" }}
                        thumbColor="#ffffff"
                        value={current.isOn}
                        disabled={cutoff.isLocked}
                        onValueChange={(val) => {
                          if (cutoff.isLocked) {
                            Alert.alert(
                              "Meal Locked",
                              `Cutoff time (${cutoff.cutoffTime}) has passed.\nPlease contact your mess manager to modify meal status.`
                            );
                            return;
                          }
                          handleToggle(card.type, val);
                        }}
                      />
                    </View>

                    {/* Guest Counter */}
                    {current.isOn && (
                      <View style={styles.guestRow}>
                        <Text style={styles.guestLabel}>Guest Meals (মেহমান):</Text>
                        <View style={styles.guestControls}>
                          <TouchableOpacity
                            style={styles.guestButton}
                            onPress={() => handleGuestChange(card.type, -1)}
                            disabled={current.guestCount <= 0}
                          >
                            <Ionicons
                              name="remove"
                              size={16}
                              color={current.guestCount <= 0 ? "#d1d5db" : "#374151"}
                            />
                          </TouchableOpacity>

                          <Text style={styles.guestCount}>{current.guestCount}</Text>

                          <TouchableOpacity
                            style={styles.guestButton}
                            onPress={() => handleGuestChange(card.type, 1)}
                          >
                            <Ionicons name="add" size={16} color="#374151" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      {/* TAB 2: COLLECTIVE MESS MEAL SHEET */}
      {activeTab === "sheet" && (
        <View style={styles.sheetContainer}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Collective Mess Meal Sheet</Text>
            <Text style={styles.sheetSubtitle}>
              {isManager
                ? "Tap any ON/OFF badge to toggle a resident's meal as Manager."
                : "Transparent daily meal status for all active mess residents."}
            </Text>
          </View>

          {sheetLoading ? (
            <ActivityIndicator size="large" color="#059669" style={{ marginVertical: 30 }} />
          ) : !dailySheet?.sheet || dailySheet.sheet.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No residents found for this date.</Text>
            </View>
          ) : (
            <View style={styles.sheetList}>
              {dailySheet.sheet.map((res: any) => {
                const b = res.meals?.breakfast || { is_on: true, guest_count: 0 };
                const l = res.meals?.lunch || { is_on: true, guest_count: 0 };
                const d = res.meals?.dinner || { is_on: true, guest_count: 0 };
                const total =
                  (b.is_on ? 1 + (b.guest_count || 0) : 0) +
                  (l.is_on ? 1 + (l.guest_count || 0) : 0) +
                  (d.is_on ? 1 + (d.guest_count || 0) : 0);

                return (
                  <View key={res.residency_id} style={styles.residentRowCard}>
                    <View style={styles.residentInfoCol}>
                      <Text style={styles.residentNameText}>{res.user_name}</Text>
                      <Text style={styles.residentBedText}>
                        Bed: {res.bed_label} • <Text style={{ textTransform: "capitalize" }}>{res.role}</Text>
                      </Text>
                    </View>

                    {/* Meal Pills */}
                    <View style={styles.residentMealsCol}>
                      {/* Breakfast */}
                      <TouchableOpacity
                        disabled={!isManager}
                        style={[
                          styles.miniBadge,
                          b.is_on ? styles.badgeOn : styles.badgeOff,
                        ]}
                        onPress={() =>
                          handleManagerToggle(
                            res.residency_id,
                            "breakfast",
                            b.is_on,
                            b.guest_count
                          )
                        }
                      >
                        <Text style={[styles.badgeText, b.is_on && styles.badgeTextOn]}>
                          B: {b.is_on ? "ON" : "OFF"}
                          {b.guest_count > 0 && `+${b.guest_count}`}
                        </Text>
                      </TouchableOpacity>

                      {/* Lunch */}
                      <TouchableOpacity
                        disabled={!isManager}
                        style={[
                          styles.miniBadge,
                          l.is_on ? styles.badgeOn : styles.badgeOff,
                        ]}
                        onPress={() =>
                          handleManagerToggle(res.residency_id, "lunch", l.is_on, l.guest_count)
                        }
                      >
                        <Text style={[styles.badgeText, l.is_on && styles.badgeTextOn]}>
                          L: {l.is_on ? "ON" : "OFF"}
                          {l.guest_count > 0 && `+${l.guest_count}`}
                        </Text>
                      </TouchableOpacity>

                      {/* Dinner */}
                      <TouchableOpacity
                        disabled={!isManager}
                        style={[
                          styles.miniBadge,
                          d.is_on ? styles.badgeOn : styles.badgeOff,
                        ]}
                        onPress={() =>
                          handleManagerToggle(res.residency_id, "dinner", d.is_on, d.guest_count)
                        }
                      >
                        <Text style={[styles.badgeText, d.is_on && styles.badgeTextOn]}>
                          D: {d.is_on ? "ON" : "OFF"}
                          {d.guest_count > 0 && `+${d.guest_count}`}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.residentTotalCol}>
                      <Text style={styles.residentTotalNum}>{total}</Text>
                      <Text style={styles.residentTotalSub}>meals</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* TAB 3: VACATIONS */}
      {activeTab === "vacations" && (
        <View style={styles.vacationsContainer}>
          <View style={styles.vacationsHeader}>
            <View>
              <Text style={styles.sheetTitle}>Vacations & Meal Pauses</Text>
              <Text style={styles.sheetSubtitle}>
                {isManager
                  ? "Review and approve pending resident vacation leaves."
                  : "Track submitted vacation leaves."}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addVacationBtn}
              onPress={() => setVacationModal(true)}
            >
              <Ionicons name="add" size={16} color="#ffffff" />
              <Text style={styles.addVacationBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>

          {vacations.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="airplane-outline" size={40} color="#9ca3af" />
              <Text style={styles.emptyText}>No vacation requests recorded.</Text>
            </View>
          ) : (
            <View style={styles.vacationList}>
              {vacations.map((vac: any) => (
                <View key={vac.id} style={styles.vacationCard}>
                  <View style={styles.vacationCardHeader}>
                    <View>
                      <Text style={styles.vacationUser}>
                        {vac.residency?.user?.name || "Resident"}
                      </Text>
                      <Text style={styles.vacationDates}>
                        {new Date(vac.start_date).toLocaleDateString()} →{" "}
                        {new Date(vac.end_date).toLocaleDateString()}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.vacationStatusPill,
                        vac.status === "approved"
                          ? styles.vacApproved
                          : vac.status === "rejected"
                          ? styles.vacRejected
                          : styles.vacPending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.vacationStatusText,
                          vac.status === "approved"
                            ? styles.vacTextApproved
                            : vac.status === "rejected"
                            ? styles.vacTextRejected
                            : styles.vacTextPending,
                        ]}
                      >
                        {vac.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {vac.reason && <Text style={styles.vacReason}>"{vac.reason}"</Text>}

                  {isManager && vac.status === "pending" && (
                    <View style={styles.vacActions}>
                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => handleApproveVacation(vac.id, "approved")}
                      >
                        <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
                        <Text style={styles.actionBtnText}>Approve</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.rejectBtn}
                        onPress={() => handleApproveVacation(vac.id, "rejected")}
                      >
                        <Ionicons name="close-circle" size={16} color="#dc2626" />
                        <Text style={[styles.actionBtnText, { color: "#dc2626" }]}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Vacation Modal */}
      <Modal visible={vacationModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply for Vacation (ছুটি)</Text>
              <TouchableOpacity onPress={() => setVacationModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Meals will be automatically paused during your approved vacation period.
            </Text>

            <Text style={styles.inputLabel}>Start Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 2026-09-25"
              value={vacationStart}
              onChangeText={setVacationStart}
            />

            <Text style={styles.inputLabel}>End Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 2026-10-02"
              value={vacationEnd}
              onChangeText={setVacationEnd}
            />

            <Text style={styles.inputLabel}>Reason (Optional)</Text>
            <TextInput
              style={[styles.modalInput, { height: 60 }]}
              placeholder="Going home for semester break..."
              value={vacationReason}
              onChangeText={setVacationReason}
              multiline
            />

            <TouchableOpacity
              style={styles.modalSubmitButton}
              onPress={handleVacationSubmit}
              disabled={vacationSubmitting}
            >
              {vacationSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.modalSubmitText}>Submit Request</Text>
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
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#e5e7eb",
    borderRadius: 14,
    padding: 3,
    marginBottom: 14,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
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
    fontSize: 12,
    fontWeight: "600",
    color: "#4b5563",
  },
  segmentTextActive: {
    color: "#065f46",
    fontWeight: "800",
  },
  dateNavigator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 14,
  },
  dateButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  dateDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  todayBadge: {
    backgroundColor: "#059669",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  todayText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },
  rateCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#d1fae5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  rateLeft: {
    flex: 1,
  },
  rateLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
    letterSpacing: 0.5,
  },
  rateValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    marginTop: 2,
  },
  rateUnit: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6b7280",
  },
  rateSub: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 3,
  },
  vacationButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ede9fe",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd6fe",
  },
  vacationButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7c3aed",
  },
  mealList: {
    gap: 12,
  },
  mealCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  mealCardOn: {
    borderColor: "#a7f3d0",
    backgroundColor: "#ffffff",
  },
  mealCardOff: {
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    opacity: 0.85,
  },
  mealCardLocked: {
    borderColor: "#fecaca",
    backgroundColor: "#fffafa",
  },
  mealCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mealCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  mealTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
  },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#fee2e2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lockBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#b91c1c",
  },
  overrideBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#f3e8ff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  overrideBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#7e22ce",
  },
  countdownBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  countdownBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#047857",
  },
  mealIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  mealTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  mealStatusText: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  guestRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  guestLabel: {
    fontSize: 12,
    color: "#4b5563",
    fontWeight: "500",
  },
  guestControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  guestButton: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  guestCount: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    minWidth: 16,
    textAlign: "center",
  },
  sheetContainer: {
    gap: 12,
  },
  sheetHeader: {
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  sheetSubtitle: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  sheetList: {
    gap: 10,
  },
  residentRowCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  residentInfoCol: {
    flex: 1.2,
  },
  residentNameText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  residentBedText: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  residentMealsCol: {
    flexDirection: "row",
    gap: 4,
  },
  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeOn: {
    backgroundColor: "#d1fae5",
  },
  badgeOff: {
    backgroundColor: "#f3f4f6",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6b7280",
  },
  badgeTextOn: {
    color: "#065f46",
  },
  residentTotalCol: {
    alignItems: "flex-end",
    marginLeft: 8,
  },
  residentTotalNum: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  residentTotalSub: {
    fontSize: 9,
    color: "#9ca3af",
  },
  vacationsContainer: {
    gap: 12,
  },
  vacationsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addVacationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#7c3aed",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addVacationBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  vacationList: {
    gap: 10,
  },
  vacationCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  vacationCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  vacationUser: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  vacationDates: {
    fontSize: 12,
    color: "#4b5563",
    marginTop: 2,
  },
  vacationStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vacApproved: {
    backgroundColor: "#d1fae5",
  },
  vacRejected: {
    backgroundColor: "#fee2e2",
  },
  vacPending: {
    backgroundColor: "#fef3c7",
  },
  vacationStatusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  vacTextApproved: {
    color: "#065f46",
  },
  vacTextRejected: {
    color: "#991b1b",
  },
  vacTextPending: {
    color: "#92400e",
  },
  vacReason: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#6b7280",
    marginTop: 6,
  },
  vacActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#059669",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rejectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fee2e2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  emptyText: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 8,
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
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
    marginTop: 10,
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
    backgroundColor: "#7c3aed",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 20,
  },
  modalSubmitText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
