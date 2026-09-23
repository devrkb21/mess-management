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
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

export function SecuritySection() {
  const { currentMessId, currentResidency, user } = useAuth();
  const isManager = currentResidency?.role === "owner" || currentResidency?.role === "manager";

  const [activeTab, setActiveTab] = useState<"dining" | "passes" | "agreements">("dining");
  const [loading, setLoading] = useState(false);

  // Dining QR State (#36)
  const [diningData, setDiningData] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>("lunch");
  const [roster, setRoster] = useState<any[]>([]);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInResult, setCheckInResult] = useState<any>(null);

  // Visitor Passes State (#37)
  const [myPasses, setMyPasses] = useState<any[]>([]);
  const [gatePasses, setGatePasses] = useState<any[]>([]);
  const [createModal, setCreateModal] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [passPurpose, setPassPurpose] = useState("visitor");
  const [passHours, setPassHours] = useState("4");
  const [creatingPass, setCreatingPass] = useState(false);

  // Gatekeeper Verification
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);

  // Digital Agreement State (#38)
  const [agreement, setAgreement] = useState<any>(null);
  const [messAgreements, setMessAgreements] = useState<any[]>([]);
  const [signModal, setSignModal] = useState(false);
  const [signatureName, setSignatureName] = useState(user?.name || "");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    if (currentMessId) {
      loadData();
    }
  }, [currentMessId, activeTab, selectedSlot]);

  const loadData = async () => {
    if (!currentMessId) return;
    setLoading(true);
    try {
      if (activeTab === "dining") {
        const [tokenRes, rosterRes] = await Promise.all([
          api.getDiningToken(currentMessId, selectedSlot).catch(() => null),
          api.getMealCheckInRoster(currentMessId, { meal_type: selectedSlot }).catch(() => ({ roster: [] })),
        ]);
        if (tokenRes) setDiningData(tokenRes);
        if (rosterRes) setRoster(rosterRes.roster || []);
      } else if (activeTab === "passes") {
        const myPassRes = await api.getMyVisitorPasses().catch(() => ({ data: [] }));
        setMyPasses(myPassRes.data || []);
        if (isManager) {
          const gRes = await api.getMessVisitorPasses(currentMessId).catch(() => ({ data: [] }));
          setGatePasses(gRes.data || []);
        }
      } else if (activeTab === "agreements") {
        if (currentResidency?.id) {
          const agRes = await api.getResidencyAgreement(currentResidency.id).catch(() => null);
          if (agRes?.agreement) {
            setAgreement(agRes.agreement);
            if (agRes.agreement.signature_name) setSignatureName(agRes.agreement.signature_name);
          }
        }
        if (isManager) {
          const allAgRes = await api.getMessAgreements(currentMessId).catch(() => []);
          setMessAgreements(allAgRes || []);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // #36 Meal QR Check-In
  const handleMealCheckIn = async () => {
    if (!currentMessId) return;
    setCheckInLoading(true);
    setCheckInResult(null);
    try {
      const res = await api.checkInMeal(currentMessId, {
        meal_type: selectedSlot,
        residency_id: currentResidency?.id,
      });
      setCheckInResult(res);
      Alert.alert("Verified!", res.message || "Meal check-in successful!");
      loadData();
    } catch (err: any) {
      const msg = err.message || "Meal check-in failed";
      setCheckInResult({ verified: false, message: msg });
      Alert.alert("Check-In Error", msg);
    } finally {
      setCheckInLoading(false);
    }
  };

  // #37 Create Pass
  const handleCreatePass = async () => {
    if (!currentMessId || !guestName.trim()) {
      Alert.alert("Required", "Please enter guest or courier name.");
      return;
    }
    setCreatingPass(true);
    try {
      const res = await api.createVisitorPass(currentMessId, {
        guest_name: guestName.trim(),
        guest_phone: guestPhone.trim() || undefined,
        purpose: passPurpose,
        valid_hours: Number(passHours),
      });
      Alert.alert("Pass Created", `Pass Code: ${res.pass.pass_code}\nShare this with your guest.`);
      setCreateModal(false);
      setGuestName("");
      setGuestPhone("");
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create visitor pass.");
    } finally {
      setCreatingPass(false);
    }
  };

  // #37 Verify Pass
  const handleVerifyPass = async () => {
    if (!currentMessId || !verifyCode.trim()) {
      Alert.alert("Required", "Please enter 6-character pass code.");
      return;
    }
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await api.verifyVisitorPass(currentMessId, verifyCode.trim());
      setVerifyResult(res);
      Alert.alert("Entry Approved", `Visitor: ${res.pass?.guest_name}\nHost: ${res.pass?.resident?.name || "Resident"}`);
      loadData();
    } catch (err: any) {
      setVerifyResult({ verified: false, message: err.message || "Invalid or expired pass" });
      Alert.alert("Pass Rejected", err.message || "Invalid or expired pass");
    } finally {
      setVerifying(false);
    }
  };

  const handleSharePass = async (pass: any) => {
    try {
      await Share.share({
        message: `Your entry pass for ${pass.mess?.name || "Mess"} is: ${pass.pass_code}. Valid for ${pass.valid_hours} hours. Please show this at the entrance gate.`,
      });
    } catch {
      // ignore
    }
  };

  // #38 Sign Agreement
  const handleSignAgreement = async () => {
    if (!currentResidency?.id) return;
    if (!termsAccepted) {
      Alert.alert("Required", "Please accept the agreement terms.");
      return;
    }
    if (!signatureName.trim()) {
      Alert.alert("Required", "Please provide your full legal name as digital signature.");
      return;
    }
    setSigning(true);
    try {
      await api.signResidencyAgreement(currentResidency.id, {
        signature_name: signatureName.trim(),
        terms_accepted: true,
      });
      Alert.alert("Signed!", "Tenancy agreement has been digitally signed and recorded.");
      setSignModal(false);
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to sign agreement.");
    } finally {
      setSigning(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Sub-tabs header */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "dining" && styles.tabBtnActive]}
          onPress={() => setActiveTab("dining")}
        >
          <Ionicons
            name="restaurant-outline"
            size={16}
            color={activeTab === "dining" ? "#059669" : "#6b7280"}
          />
          <Text style={[styles.tabBtnText, activeTab === "dining" && styles.tabBtnTextActive]}>
            Meal QR
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "passes" && styles.tabBtnActive]}
          onPress={() => setActiveTab("passes")}
        >
          <Ionicons
            name="key-outline"
            size={16}
            color={activeTab === "passes" ? "#059669" : "#6b7280"}
          />
          <Text style={[styles.tabBtnText, activeTab === "passes" && styles.tabBtnTextActive]}>
            Passes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "agreements" && styles.tabBtnActive]}
          onPress={() => setActiveTab("agreements")}
        >
          <Ionicons
            name="document-text-outline"
            size={16}
            color={activeTab === "agreements" ? "#059669" : "#6b7280"}
          />
          <Text style={[styles.tabBtnText, activeTab === "agreements" && styles.tabBtnTextActive]}>
            Agreement
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#059669" style={{ marginVertical: 30 }} />
      ) : (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* TAB 1: MEAL QR CHECK-IN (#36) */}
          {activeTab === "dining" && (
            <View style={styles.sectionWrap}>
              {/* Meal Slot Toggle */}
              <View style={styles.slotToggleRow}>
                {["breakfast", "lunch", "dinner"].map((slot) => (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.slotChip, selectedSlot === slot && styles.slotChipActive]}
                    onPress={() => setSelectedSlot(slot)}
                  >
                    <Text style={[styles.slotChipText, selectedSlot === slot && styles.slotChipTextActive]}>
                      {slot.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* QR Token Display Card */}
              <View style={styles.qrCard}>
                <View style={styles.qrIconBadge}>
                  <Ionicons name="qr-code" size={40} color="#059669" />
                </View>
                <Text style={styles.qrCardTitle}>Dining Hall Check-In Token</Text>
                <Text style={styles.qrCardSub}>
                  Show this one-time code or redeem directly to confirm your {selectedSlot} meal.
                </Text>

                <View style={styles.tokenBox}>
                  <Text style={styles.tokenText}>{diningData?.dining_token || "------"}</Text>
                  <Text style={styles.tokenExpiry}>
                    Valid today for {diningData?.meal_type?.toUpperCase() || selectedSlot.toUpperCase()}
                  </Text>
                </View>

                {/* Redeem Button for Resident */}
                <TouchableOpacity
                  style={[styles.redeemBtn, checkInLoading && { opacity: 0.7 }]}
                  onPress={handleMealCheckIn}
                  disabled={checkInLoading}
                >
                  {checkInLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                      <Text style={styles.redeemBtnText}>Check In My Meal Now</Text>
                    </>
                  )}
                </TouchableOpacity>

                {checkInResult && (
                  <View
                    style={[
                      styles.resultBanner,
                      { backgroundColor: checkInResult.verified ? "#ecfdf5" : "#fef2f2" },
                    ]}
                  >
                    <Ionicons
                      name={checkInResult.verified ? "checkmark-circle" : "alert-circle"}
                      size={18}
                      color={checkInResult.verified ? "#059669" : "#dc2626"}
                    />
                    <Text
                      style={[
                        styles.resultBannerText,
                        { color: checkInResult.verified ? "#065f46" : "#991b1b" },
                      ]}
                    >
                      {checkInResult.message}
                    </Text>
                  </View>
                )}
              </View>

              {/* Check-In Roster for Today */}
              <View style={styles.rosterCard}>
                <View style={styles.rosterHeader}>
                  <Ionicons name="people" size={18} color="#111827" />
                  <Text style={styles.rosterTitle}>
                    Today's Check-In Roster ({roster.filter((r) => r.checked_in).length} / {roster.length})
                  </Text>
                </View>
                {roster.length === 0 ? (
                  <Text style={styles.emptyText}>No residents scheduled for this meal slot.</Text>
                ) : (
                  roster.map((item, idx) => (
                    <View key={item.residency_id || idx} style={styles.rosterItem}>
                      <View style={styles.rosterAvatar}>
                        <Text style={styles.avatarText}>{(item.resident_name || "R")[0]}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.rosterName}>{item.resident_name}</Text>
                        <Text style={styles.rosterSub}>
                          {item.room_number ? `Room ${item.room_number}` : "Resident"} • {item.count} meal(s)
                        </Text>
                      </View>
                      {item.checked_in ? (
                        <View style={styles.checkedInBadge}>
                          <Ionicons name="checkmark" size={12} color="#059669" />
                          <Text style={styles.checkedInText}>Redeemed</Text>
                        </View>
                      ) : (
                        <View style={styles.pendingBadge}>
                          <Text style={styles.pendingText}>Pending</Text>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>
            </View>
          )}

          {/* TAB 2: VISITOR & PARCEL PASSES (#37) */}
          {activeTab === "passes" && (
            <View style={styles.sectionWrap}>
              {/* Top Action Bar */}
              <View style={styles.passTopRow}>
                <View>
                  <Text style={styles.sectionHeading}>Visitor & Parcel Passes</Text>
                  <Text style={styles.sectionSubHeading}>Secure 1-time gate access passes</Text>
                </View>
                <TouchableOpacity
                  style={styles.createPassBtn}
                  onPress={() => setCreateModal(true)}
                >
                  <Ionicons name="add" size={16} color="#ffffff" />
                  <Text style={styles.createPassBtnText}>New Pass</Text>
                </TouchableOpacity>
              </View>

              {/* Gatekeeper Terminal (for Manager / Staff) */}
              {isManager && (
                <View style={styles.gateTerminalCard}>
                  <View style={styles.gateHeader}>
                    <Ionicons name="shield-checkmark" size={18} color="#4338ca" />
                    <Text style={styles.gateTitle}>Gatekeeper Pass Verification</Text>
                  </View>
                  <Text style={styles.gateSub}>
                    Enter the 6-character code presented by guest or courier:
                  </Text>
                  <View style={styles.gateInputRow}>
                    <TextInput
                      style={styles.gateInput}
                      placeholder="e.g. VP-4821"
                      placeholderTextColor="#9ca3af"
                      value={verifyCode}
                      onChangeText={(t) => setVerifyCode(t.toUpperCase())}
                      autoCapitalize="characters"
                      maxLength={10}
                    />
                    <TouchableOpacity
                      style={[styles.gateVerifyBtn, verifying && { opacity: 0.7 }]}
                      onPress={handleVerifyPass}
                      disabled={verifying}
                    >
                      {verifying ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Text style={styles.gateVerifyBtnText}>Verify</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {verifyResult && (
                    <View
                      style={[
                        styles.verifyResultCard,
                        { borderColor: verifyResult.verified ? "#10b981" : "#ef4444" },
                      ]}
                    >
                      <Ionicons
                        name={verifyResult.verified ? "checkmark-circle" : "close-circle"}
                        size={24}
                        color={verifyResult.verified ? "#10b981" : "#ef4444"}
                      />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.verifyResultTitle}>
                          {verifyResult.verified ? "Entry Approved" : "Access Denied"}
                        </Text>
                        <Text style={styles.verifyResultDesc}>{verifyResult.message}</Text>
                        {verifyResult.pass && (
                          <Text style={styles.verifyResultMeta}>
                            Guest: {verifyResult.pass.guest_name} • Host:{" "}
                            {verifyResult.pass.resident?.name || "Resident"}
                          </Text>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* My Active Passes */}
              <Text style={styles.listSectionTitle}>My Passes ({myPasses.length})</Text>
              {myPasses.length === 0 ? (
                <Text style={styles.emptyText}>You have not generated any visitor passes yet.</Text>
              ) : (
                myPasses.map((pass) => (
                  <View key={pass.id} style={styles.passCard}>
                    <View style={styles.passCardHeader}>
                      <View>
                        <Text style={styles.passGuestName}>{pass.guest_name}</Text>
                        <Text style={styles.passMeta}>
                          {pass.purpose.toUpperCase()} • Valid {pass.valid_hours}h
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.passStatusBadge,
                          pass.status === "active"
                            ? { backgroundColor: "#ecfdf5" }
                            : pass.status === "used"
                            ? { backgroundColor: "#eff6ff" }
                            : { backgroundColor: "#fef2f2" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.passStatusText,
                            pass.status === "active"
                              ? { color: "#059669" }
                              : pass.status === "used"
                              ? { color: "#2563eb" }
                              : { color: "#dc2626" },
                          ]}
                        >
                          {pass.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.passCodeRow}>
                      <View style={styles.codePill}>
                        <Text style={styles.codePillText}>{pass.pass_code}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.sharePassBtn}
                        onPress={() => handleSharePass(pass)}
                      >
                        <Ionicons name="share-social-outline" size={16} color="#059669" />
                        <Text style={styles.sharePassText}>Share Code</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* TAB 3: DIGITAL TENANCY AGREEMENT (#38) */}
          {activeTab === "agreements" && (
            <View style={styles.sectionWrap}>
              {/* My Agreement Status */}
              <View style={styles.agreementCard}>
                <View style={styles.agreementHeader}>
                  <Ionicons name="document-text" size={24} color="#059669" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.agreementTitle}>Tenancy Agreement</Text>
                    <Text style={styles.agreementSub}>
                      Standard Hostel & Mess Living Rules & Terms
                    </Text>
                  </View>
                  {agreement?.is_signed ? (
                    <View style={styles.signedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#059669" />
                      <Text style={styles.signedText}>Signed</Text>
                    </View>
                  ) : (
                    <View style={styles.pendingSignBadge}>
                      <Text style={styles.pendingSignText}>Unsigned</Text>
                    </View>
                  )}
                </View>

                <View style={styles.termsBox}>
                  <Text style={styles.termsHead}>Key Tenancy Terms:</Text>
                  <Text style={styles.termsItem}>• Monthly bills must be paid by the 10th of each month.</Text>
                  <Text style={styles.termsItem}>• Notice period of 30 days required before leaving the mess.</Text>
                  <Text style={styles.termsItem}>• Gate curfew: 11:00 PM. Late entries require prior permission.</Text>
                  <Text style={styles.termsItem}>• Smoking, alcohol, and disruptive behavior are strictly prohibited.</Text>
                  <Text style={styles.termsItem}>• Security deposit will be refunded upon clearance inspection.</Text>
                </View>

                {agreement?.is_signed ? (
                  <View style={styles.signedInfoBox}>
                    <Ionicons name="shield-checkmark" size={18} color="#059669" />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.signedInfoName}>Digitally Signed by: {agreement.signature_name}</Text>
                      <Text style={styles.signedInfoDate}>
                        Date: {new Date(agreement.signed_at).toLocaleDateString()} • IP: {agreement.ip_address || "Logged"}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.signNowBtn}
                    onPress={() => setSignModal(true)}
                  >
                    <Ionicons name="create-outline" size={18} color="#ffffff" />
                    <Text style={styles.signNowBtnText}>Review & Sign Agreement</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Manager Roster of Agreements */}
              {isManager && (
                <View style={{ marginTop: 20 }}>
                  <Text style={styles.listSectionTitle}>All Resident Agreements ({messAgreements.length})</Text>
                  {messAgreements.map((ag) => (
                    <View key={ag.id} style={styles.managerAgRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.agResidentName}>{ag.resident?.name || "Resident"}</Text>
                        <Text style={styles.agResidentSub}>
                          {ag.signature_name ? `Signed as "${ag.signature_name}"` : "Pending Signature"}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.agStatusPill,
                          ag.is_signed ? { backgroundColor: "#ecfdf5" } : { backgroundColor: "#fef2f2" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.agStatusPillText,
                            ag.is_signed ? { color: "#059669" } : { color: "#dc2626" },
                          ]}
                        >
                          {ag.is_signed ? "Signed" : "Pending"}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* MODAL: CREATE VISITOR PASS */}
      <Modal visible={createModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Generate Visitor Pass</Text>
              <TouchableOpacity onPress={() => setCreateModal(false)}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Visitor / Courier Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. John Doe / Daraz Delivery"
              value={guestName}
              onChangeText={setGuestName}
            />

            <Text style={styles.inputLabel}>Phone (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 01712345678"
              value={guestPhone}
              onChangeText={setGuestPhone}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Purpose</Text>
            <View style={styles.chipRow}>
              {[
                { key: "visitor", label: "Guest" },
                { key: "delivery", label: "Parcel" },
                { key: "maintenance", label: "Repair" },
              ].map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.choiceChip, passPurpose === c.key && styles.choiceChipActive]}
                  onPress={() => setPassPurpose(c.key)}
                >
                  <Text style={[styles.choiceChipText, passPurpose === c.key && styles.choiceChipTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Valid Duration</Text>
            <View style={styles.chipRow}>
              {[
                { h: "2", label: "2 Hours" },
                { h: "4", label: "4 Hours" },
                { h: "8", label: "8 Hours" },
                { h: "24", label: "24 Hours" },
              ].map((h) => (
                <TouchableOpacity
                  key={h.h}
                  style={[styles.choiceChip, passHours === h.h && styles.choiceChipActive]}
                  onPress={() => setPassHours(h.h)}
                >
                  <Text style={[styles.choiceChipText, passHours === h.h && styles.choiceChipTextActive]}>
                    {h.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, creatingPass && { opacity: 0.7 }]}
              onPress={handleCreatePass}
              disabled={creatingPass}
            >
              {creatingPass ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitBtnText}>Generate Pass</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: SIGN DIGITAL AGREEMENT */}
      <Modal visible={signModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sign Tenancy Agreement</Text>
              <TouchableOpacity onPress={() => setSignModal(false)}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              By signing electronically, you accept all rules, payment deadlines, and living policies of {currentResidency?.mess?.name || "this mess"}.
            </Text>

            <Text style={styles.inputLabel}>Full Legal Name (Digital Signature) *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Your full name as signature"
              value={signatureName}
              onChangeText={setSignatureName}
            />

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setTermsAccepted(!termsAccepted)}
            >
              <Ionicons
                name={termsAccepted ? "checkbox" : "square-outline"}
                size={22}
                color={termsAccepted ? "#059669" : "#9ca3af"}
              />
              <Text style={styles.checkboxLabel}>
                I agree to the mess terms and acknowledge this digital signature is legally binding.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, signing && { opacity: 0.7 }]}
              onPress={handleSignAgreement}
              disabled={signing}
            >
              {signing ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitBtnText}>Sign Electronically</Text>
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
    gap: 16,
  },
  slotToggleRow: {
    flexDirection: "row",
    gap: 8,
  },
  slotChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  slotChipActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  slotChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4b5563",
  },
  slotChipTextActive: {
    color: "#ffffff",
  },
  qrCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  qrIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  qrCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  qrCardSub: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  tokenBox: {
    backgroundColor: "#f3f4f6",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    width: "100%",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  tokenText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#059669",
    letterSpacing: 4,
  },
  tokenExpiry: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  redeemBtn: {
    backgroundColor: "#059669",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: "100%",
    gap: 8,
  },
  redeemBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  resultBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    width: "100%",
    gap: 8,
  },
  resultBannerText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  rosterCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  rosterHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  rosterTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  rosterItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  rosterAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#065f46",
    fontWeight: "700",
    fontSize: 14,
  },
  rosterName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  rosterSub: {
    fontSize: 12,
    color: "#6b7280",
  },
  checkedInBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  checkedInText: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "600",
  },
  pendingBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pendingText: {
    fontSize: 12,
    color: "#6b7280",
  },
  passTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  sectionSubHeading: {
    fontSize: 12,
    color: "#6b7280",
  },
  createPassBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  createPassBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  gateTerminalCard: {
    backgroundColor: "#eef2ff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#c7d2fe",
  },
  gateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gateTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#3730a3",
  },
  gateSub: {
    fontSize: 12,
    color: "#4f46e5",
    marginTop: 2,
    marginBottom: 10,
  },
  gateInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  gateInput: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#c7d2fe",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: "700",
    color: "#1e1b4b",
  },
  gateVerifyBtn: {
    backgroundColor: "#4338ca",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  gateVerifyBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  verifyResultCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  verifyResultTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  verifyResultDesc: {
    fontSize: 12,
    color: "#4b5563",
  },
  verifyResultMeta: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  listSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginTop: 8,
  },
  passCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  passCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  passGuestName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  passMeta: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  passStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  passStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  passCodeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  codePill: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  codePillText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: 1.5,
  },
  sharePassBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sharePassText: {
    color: "#059669",
    fontSize: 13,
    fontWeight: "600",
  },
  agreementCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  agreementHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  agreementTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  agreementSub: {
    fontSize: 12,
    color: "#6b7280",
  },
  signedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  signedText: {
    color: "#059669",
    fontSize: 12,
    fontWeight: "700",
  },
  pendingSignBadge: {
    backgroundColor: "#fef2f2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pendingSignText: {
    color: "#dc2626",
    fontSize: 12,
    fontWeight: "700",
  },
  termsBox: {
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    gap: 6,
  },
  termsHead: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 2,
  },
  termsItem: {
    fontSize: 12,
    color: "#4b5563",
    lineHeight: 18,
  },
  signedInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    padding: 12,
    borderRadius: 8,
    marginTop: 14,
  },
  signedInfoName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#065f46",
  },
  signedInfoDate: {
    fontSize: 11,
    color: "#047857",
  },
  signNowBtn: {
    backgroundColor: "#059669",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 14,
    gap: 8,
  },
  signNowBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  managerAgRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  agResidentName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  agResidentSub: {
    fontSize: 11,
    color: "#6b7280",
  },
  agStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  agStatusPillText: {
    fontSize: 11,
    fontWeight: "700",
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
    maxHeight: "85%",
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
  modalSub: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginTop: 10,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  choiceChipActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  choiceChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4b5563",
  },
  choiceChipTextActive: {
    color: "#ffffff",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 16,
    marginBottom: 16,
  },
  checkboxLabel: {
    fontSize: 13,
    color: "#374151",
    flex: 1,
    lineHeight: 18,
  },
  submitBtn: {
    backgroundColor: "#059669",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 13,
    color: "#9ca3af",
    fontStyle: "italic",
    paddingVertical: 10,
  },
});
