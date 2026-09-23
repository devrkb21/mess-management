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

export function CommunitySection() {
  const { currentMessId, currentResidency, user } = useAuth();
  const isManager = currentResidency?.role === "owner" || currentResidency?.role === "manager";

  const [activeTab, setActiveTab] = useState<"trust" | "lifestyle" | "reviews">("trust");
  const [loading, setLoading] = useState(false);

  // Trust Score State (#40)
  const [userTrust, setUserTrust] = useState<any>(null);
  const [messTrust, setMessTrust] = useState<any>(null);

  // Lifestyle Quiz State (#41)
  const [sleepSchedule, setSleepSchedule] = useState("flexible");
  const [studyHabits, setStudyHabits] = useState("moderate");
  const [cleanliness, setCleanliness] = useState("moderate");
  const [smokingPolicy, setSmokingPolicy] = useState("non_smoker");
  const [guestFreq, setGuestFreq] = useState("occasional");
  const [savingLifestyle, setSavingLifestyle] = useState(false);

  // Reviews State (#39)
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewType, setReviewType] = useState<"resident_to_mess" | "manager_to_resident">("resident_to_mess");
  const [selectedResidentId, setSelectedResidentId] = useState("");
  const [residents, setResidents] = useState<any[]>([]);
  const [ratingOverall, setRatingOverall] = useState(5);
  const [ratingFood, setRatingFood] = useState(5);
  const [ratingCleanliness, setRatingCleanliness] = useState(5);
  const [ratingPunctuality, setRatingPunctuality] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    loadData();
  }, [user?.id, currentMessId, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "trust" && user?.id) {
        const uRes = await api.getUserTrustScore(user.id).catch(() => null);
        if (uRes) setUserTrust(uRes);
      } else if (activeTab === "lifestyle") {
        const lRes = await api.getLifestyleProfile().catch(() => null);
        if (lRes?.profile) {
          setSleepSchedule(lRes.profile.sleep_schedule || "flexible");
          setStudyHabits(lRes.profile.study_work_habits || "moderate");
          setCleanliness(lRes.profile.cleanliness_level || "moderate");
          setSmokingPolicy(lRes.profile.smoking_policy || "non_smoker");
          setGuestFreq(lRes.profile.guest_frequency || "occasional");
        }
      } else if (activeTab === "reviews") {
        if (currentMessId) {
          const mRes = await api.getMessTrustScore(currentMessId).catch(() => null);
          if (mRes) setMessTrust(mRes);
        }
        if (isManager && currentMessId) {
          const rRes = await api.getResidents(currentMessId).catch(() => ({ residents: [] }));
          setResidents(rRes.residents || []);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLifestyle = async () => {
    setSavingLifestyle(true);
    try {
      await api.saveLifestyleProfile({
        sleep_schedule: sleepSchedule,
        study_work_habits: studyHabits,
        cleanliness_level: cleanliness,
        smoking_policy: smokingPolicy,
        guest_frequency: guestFreq,
      });
      Alert.alert("Saved!", "Your lifestyle profile has been updated for roommate compatibility matching.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update lifestyle preferences.");
    } finally {
      setSavingLifestyle(false);
    }
  };

  const handleSubmitReview = async () => {
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
      Alert.alert("Review Submitted", "Thank you for contributing to the community trust network!");
      setReviewModal(false);
      setReviewComment("");
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Sub-tab navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "trust" && styles.tabBtnActive]}
          onPress={() => setActiveTab("trust")}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={16}
            color={activeTab === "trust" ? "#059669" : "#6b7280"}
          />
          <Text style={[styles.tabBtnText, activeTab === "trust" && styles.tabBtnTextActive]}>
            Trust Score
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "lifestyle" && styles.tabBtnActive]}
          onPress={() => setActiveTab("lifestyle")}
        >
          <Ionicons
            name="heart-outline"
            size={16}
            color={activeTab === "lifestyle" ? "#059669" : "#6b7280"}
          />
          <Text style={[styles.tabBtnText, activeTab === "lifestyle" && styles.tabBtnTextActive]}>
            Lifestyle Quiz
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "reviews" && styles.tabBtnActive]}
          onPress={() => setActiveTab("reviews")}
        >
          <Ionicons
            name="star-outline"
            size={16}
            color={activeTab === "reviews" ? "#059669" : "#6b7280"}
          />
          <Text style={[styles.tabBtnText, activeTab === "reviews" && styles.tabBtnTextActive]}>
            Reviews
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#059669" style={{ marginVertical: 30 }} />
      ) : (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* TAB 1: TRUST SCORE (#40) */}
          {activeTab === "trust" && (
            <View style={styles.sectionWrap}>
              {/* Trust Card */}
              <View style={styles.trustScoreCard}>
                <View style={styles.trustBadgeIcon}>
                  <Ionicons name="sparkles" size={32} color="#059669" />
                </View>
                <Text style={styles.trustTitle}>{userTrust?.badge_title || "Verified Member"}</Text>
                <Text style={styles.trustSub}>
                  Verified Reputation Protocol calculated from payments, evaluations, and KYC.
                </Text>

                <View style={styles.scoreCircle}>
                  <Text style={styles.scoreNumber}>{userTrust?.trust_score ?? 90}</Text>
                  <Text style={styles.scoreDenom}>/ 100 PTS</Text>
                  <View style={styles.tierPill}>
                    <Text style={styles.tierPillText}>
                      TIER: {userTrust?.badge?.toUpperCase() || "ELITE"}
                    </Text>
                  </View>
                </View>

                {/* Breakdown bars */}
                <View style={styles.breakdownWrap}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>On-Time Payments (40%)</Text>
                    <Text style={styles.breakdownVal}>
                      {userTrust?.breakdown?.payment_score ?? 36} / 40
                    </Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${((userTrust?.breakdown?.payment_score ?? 36) / 40) * 100}%` },
                      ]}
                    />
                  </View>

                  <View style={[styles.breakdownRow, { marginTop: 10 }]}>
                    <Text style={styles.breakdownLabel}>Exit Ratings (35%)</Text>
                    <Text style={styles.breakdownVal}>
                      {userTrust?.breakdown?.review_score ?? 32} / 35
                    </Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${((userTrust?.breakdown?.review_score ?? 32) / 35) * 100}%` },
                      ]}
                    />
                  </View>

                  <View style={[styles.breakdownRow, { marginTop: 10 }]}>
                    <Text style={styles.breakdownLabel}>Clearance Record (15%)</Text>
                    <Text style={styles.breakdownVal}>
                      {userTrust?.breakdown?.clearance_score ?? 15} / 15
                    </Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${((userTrust?.breakdown?.clearance_score ?? 15) / 15) * 100}%` },
                      ]}
                    />
                  </View>

                  <View style={[styles.breakdownRow, { marginTop: 10 }]}>
                    <Text style={styles.breakdownLabel}>KYC Verification (10%)</Text>
                    <Text style={styles.breakdownVal}>
                      {userTrust?.breakdown?.kyc_score ?? 10} / 10
                    </Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${((userTrust?.breakdown?.kyc_score ?? 10) / 10) * 100}%` },
                      ]}
                    />
                  </View>
                </View>
              </View>

              {/* Trust Perks */}
              <Text style={styles.sectionHeader}>Reputation Perks</Text>
              <View style={styles.perkCard}>
                <Ionicons name="flash" size={20} color="#059669" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.perkTitle}>Instant Bed Approval</Text>
                  <Text style={styles.perkDesc}>
                    Trust scores above 85 bypass manual vetting and move to the top of waiting lists.
                  </Text>
                </View>
              </View>

              <View style={styles.perkCard}>
                <Ionicons name="shield-checkmark" size={20} color="#2563eb" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.perkTitle}>Deposit Reductions</Text>
                  <Text style={styles.perkDesc}>
                    Elite verified members qualify for low-deposit onboarding at partner properties.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* TAB 2: LIFESTYLE QUIZ (#41) */}
          {activeTab === "lifestyle" && (
            <View style={styles.sectionWrap}>
              <View style={styles.quizHeaderCard}>
                <Text style={styles.quizHeaderTitle}>Roommate Lifestyle Matching</Text>
                <Text style={styles.quizHeaderSub}>
                  Select your daily living habits to find culturally aligned messes and compatible roommates.
                </Text>
              </View>

              {/* 1. Sleep Schedule */}
              <View style={styles.quizQuestionBox}>
                <Text style={styles.questionTitle}>1. Sleep & Wake Schedule</Text>
                <View style={styles.chipRow}>
                  {[
                    { key: "early_bird", label: "Early Bird" },
                    { key: "night_owl", label: "Night Owl" },
                    { key: "flexible", label: "Flexible" },
                  ].map((c) => (
                    <TouchableOpacity
                      key={c.key}
                      style={[styles.quizChip, sleepSchedule === c.key && styles.quizChipActive]}
                      onPress={() => setSleepSchedule(c.key)}
                    >
                      <Text
                        style={[
                          styles.quizChipText,
                          sleepSchedule === c.key && styles.quizChipTextActive,
                        ]}
                      >
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 2. Study Habits */}
              <View style={styles.quizQuestionBox}>
                <Text style={styles.questionTitle}>2. Study & Work Environment</Text>
                <View style={styles.chipRow}>
                  {[
                    { key: "silent", label: "Pin-Drop Silent" },
                    { key: "moderate", label: "Moderate Vibe" },
                    { key: "lively", label: "Lively & Social" },
                  ].map((c) => (
                    <TouchableOpacity
                      key={c.key}
                      style={[styles.quizChip, studyHabits === c.key && styles.quizChipActive]}
                      onPress={() => setStudyHabits(c.key)}
                    >
                      <Text
                        style={[
                          styles.quizChipText,
                          studyHabits === c.key && styles.quizChipTextActive,
                        ]}
                      >
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 3. Cleanliness */}
              <View style={styles.quizQuestionBox}>
                <Text style={styles.questionTitle}>3. Cleanliness Standards</Text>
                <View style={styles.chipRow}>
                  {[
                    { key: "strict", label: "Strict & Tidy" },
                    { key: "moderate", label: "Standard / Weekly" },
                    { key: "relaxed", label: "Relaxed" },
                  ].map((c) => (
                    <TouchableOpacity
                      key={c.key}
                      style={[styles.quizChip, cleanliness === c.key && styles.quizChipActive]}
                      onPress={() => setCleanliness(c.key)}
                    >
                      <Text
                        style={[
                          styles.quizChipText,
                          cleanliness === c.key && styles.quizChipTextActive,
                        ]}
                      >
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 4. Smoking Policy */}
              <View style={styles.quizQuestionBox}>
                <Text style={styles.questionTitle}>4. Smoking Policy Preference</Text>
                <View style={styles.chipRow}>
                  {[
                    { key: "non_smoker", label: "Strict Non-Smoker" },
                    { key: "smoker_outside", label: "Smoker (Outside)" },
                    { key: "no_preference", label: "No Preference" },
                  ].map((c) => (
                    <TouchableOpacity
                      key={c.key}
                      style={[styles.quizChip, smokingPolicy === c.key && styles.quizChipActive]}
                      onPress={() => setSmokingPolicy(c.key)}
                    >
                      <Text
                        style={[
                          styles.quizChipText,
                          smokingPolicy === c.key && styles.quizChipTextActive,
                        ]}
                      >
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 5. Guest Frequency */}
              <View style={styles.quizQuestionBox}>
                <Text style={styles.questionTitle}>5. Guest & Visitor Frequency</Text>
                <View style={styles.chipRow}>
                  {[
                    { key: "rare", label: "Rare / None" },
                    { key: "occasional", label: "Occasional" },
                    { key: "frequent", label: "Frequent" },
                  ].map((c) => (
                    <TouchableOpacity
                      key={c.key}
                      style={[styles.quizChip, guestFreq === c.key && styles.quizChipActive]}
                      onPress={() => setGuestFreq(c.key)}
                    >
                      <Text
                        style={[
                          styles.quizChipText,
                          guestFreq === c.key && styles.quizChipTextActive,
                        ]}
                      >
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, savingLifestyle && { opacity: 0.7 }]}
                onPress={handleSaveLifestyle}
                disabled={savingLifestyle}
              >
                {savingLifestyle ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Lifestyle Profile</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 3: EXIT REVIEWS (#39) */}
          {activeTab === "reviews" && (
            <View style={styles.sectionWrap}>
              <View style={styles.reviewTopRow}>
                <View>
                  <Text style={styles.sectionHeader}>Mess Community Score</Text>
                  <Text style={styles.sectionSub}>Ratings & evaluations from residents</Text>
                </View>
                <TouchableOpacity
                  style={styles.leaveReviewBtn}
                  onPress={() => setReviewModal(true)}
                >
                  <Ionicons name="star" size={14} color="#ffffff" />
                  <Text style={styles.leaveReviewBtnText}>Rate Mess</Text>
                </TouchableOpacity>
              </View>

              {/* Mess Score Card */}
              <View style={styles.messScoreCard}>
                <Text style={styles.messScoreBig}>
                  {messTrust?.rating_overall ? Number(messTrust.rating_overall).toFixed(1) : "5.0"}
                </Text>
                <View style={{ flexDirection: "row", gap: 3, marginVertical: 4 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Ionicons key={i} name="star" size={16} color="#f59e0b" />
                  ))}
                </View>
                <Text style={styles.messScoreSub}>
                  {messTrust?.total_reviews ?? 0} verified resident reviews •{" "}
                  {messTrust?.badge_title || "Verified Mess"}
                </Text>
              </View>

              {/* Sub-ratings */}
              <View style={styles.subRatingRow}>
                <View style={styles.subRatingBox}>
                  <Text style={styles.subRatingLabel}>Food Quality</Text>
                  <Text style={styles.subRatingVal}>
                    {messTrust?.rating_food ? Number(messTrust.rating_food).toFixed(1) : "5.0"}★
                  </Text>
                </View>
                <View style={styles.subRatingBox}>
                  <Text style={styles.subRatingLabel}>Cleanliness</Text>
                  <Text style={styles.subRatingVal}>
                    {messTrust?.rating_cleanliness ? Number(messTrust.rating_cleanliness).toFixed(1) : "5.0"}★
                  </Text>
                </View>
                <View style={styles.subRatingBox}>
                  <Text style={styles.subRatingLabel}>Management</Text>
                  <Text style={styles.subRatingVal}>
                    {messTrust?.rating_punctuality ? Number(messTrust.rating_punctuality).toFixed(1) : "5.0"}★
                  </Text>
                </View>
              </View>

              {/* Testimonials */}
              <Text style={[styles.sectionHeader, { marginTop: 12 }]}>Recent Testimonials</Text>
              {messTrust?.recent_reviews?.length === 0 ? (
                <Text style={styles.emptyText}>No reviews submitted yet.</Text>
              ) : (
                messTrust?.recent_reviews?.map((r: any) => (
                  <View key={r.id} style={styles.reviewCard}>
                    <View style={styles.reviewCardHeader}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <View style={styles.reviewAvatar}>
                          <Text style={styles.reviewAvatarText}>{(r.reviewer_name || "R")[0]}</Text>
                        </View>
                        <View>
                          <Text style={styles.reviewerName}>{r.reviewer_name}</Text>
                          <Text style={styles.reviewTime}>{r.created_at}</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: "row", gap: 2 }}>
                        {[...Array(r.rating_overall || 5)].map((_, i) => (
                          <Ionicons key={i} name="star" size={13} color="#f59e0b" />
                        ))}
                      </View>
                    </View>
                    {r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
                  </View>
                ))
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* MODAL: SUBMIT REVIEW (#39) */}
      <Modal visible={reviewModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Leave Evaluation</Text>
              <TouchableOpacity onPress={() => setReviewModal(false)}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {isManager && (
              <>
                <Text style={styles.inputLabel}>Review Target</Text>
                <View style={styles.chipRow}>
                  <TouchableOpacity
                    style={[styles.quizChip, reviewType === "resident_to_mess" && styles.quizChipActive]}
                    onPress={() => setReviewType("resident_to_mess")}
                  >
                    <Text style={[styles.quizChipText, reviewType === "resident_to_mess" && styles.quizChipTextActive]}>
                      Rate Mess
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.quizChip, reviewType === "manager_to_resident" && styles.quizChipActive]}
                    onPress={() => setReviewType("manager_to_resident")}
                  >
                    <Text style={[styles.quizChipText, reviewType === "manager_to_resident" && styles.quizChipTextActive]}>
                      Rate Exited Resident
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <Text style={styles.inputLabel}>Overall Rating ({ratingOverall} Stars)</Text>
            <View style={{ flexDirection: "row", gap: 12, marginVertical: 6 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRatingOverall(star)}>
                  <Ionicons
                    name="star"
                    size={32}
                    color={ratingOverall >= star ? "#f59e0b" : "#d1d5db"}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Feedback & Comments</Text>
            <TextInput
              style={styles.reviewInput}
              multiline
              numberOfLines={4}
              placeholder="Share honest feedback about meal quality, facilities, or payment discipline..."
              value={reviewComment}
              onChangeText={setReviewComment}
            />

            <TouchableOpacity
              style={[styles.saveBtn, submittingReview && { opacity: 0.7 }]}
              onPress={handleSubmitReview}
              disabled={submittingReview}
            >
              {submittingReview ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.saveBtnText}>Submit Evaluation</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: "#ecfdf5",
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4b5563",
  },
  tabBtnTextActive: {
    color: "#059669",
    fontWeight: "700",
  },
  scrollContent: {
    padding: 16,
  },
  sectionWrap: {
    gap: 14,
  },
  trustScoreCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  trustBadgeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  trustTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  trustSub: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 3,
    marginBottom: 14,
  },
  scoreCircle: {
    backgroundColor: "#f3f4f6",
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
    borderWidth: 2,
    borderColor: "#059669",
  },
  scoreNumber: {
    fontSize: 34,
    fontWeight: "900",
    color: "#059669",
  },
  scoreDenom: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6b7280",
  },
  tierPill: {
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  tierPillText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#059669",
  },
  breakdownWrap: {
    width: "100%",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  breakdownVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  barTrack: {
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    marginTop: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: "#059669",
    borderRadius: 3,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  sectionSub: {
    fontSize: 12,
    color: "#6b7280",
  },
  perkCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  perkTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  perkDesc: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  quizHeaderCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  quizHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  quizHeaderSub: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 3,
  },
  quizQuestionBox: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  questionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  quizChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  quizChipActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  quizChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4b5563",
  },
  quizChipTextActive: {
    color: "#ffffff",
  },
  saveBtn: {
    backgroundColor: "#059669",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 6,
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  reviewTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leaveReviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  leaveReviewBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  messScoreCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  messScoreBig: {
    fontSize: 36,
    fontWeight: "900",
    color: "#059669",
  },
  messScoreSub: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  subRatingRow: {
    flexDirection: "row",
    gap: 8,
  },
  subRatingBox: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  subRatingLabel: {
    fontSize: 11,
    color: "#6b7280",
  },
  subRatingVal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginTop: 2,
  },
  reviewCard: {
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  reviewCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewAvatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#065f46",
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  reviewTime: {
    fontSize: 11,
    color: "#9ca3af",
  },
  reviewComment: {
    fontSize: 13,
    color: "#4b5563",
    marginTop: 8,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginTop: 10,
    marginBottom: 4,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    textAlignVertical: "top",
    color: "#111827",
  },
  emptyText: {
    fontSize: 13,
    color: "#9ca3af",
    fontStyle: "italic",
    paddingVertical: 8,
  },
});
