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
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { SecuritySection } from "./SecuritySection";
import { CommunitySection } from "./CommunitySection";
import { AnalyticsSection } from "./AnalyticsSection";

type OpSection = "residents" | "rooms" | "security" | "community" | "analytics" | "notices" | "complaints" | "leave" | "admin";

export function OperationsScreen() {
  const { currentMessId, currentResidency, user, logout, refreshUser } = useAuth();
  const isManager = currentResidency?.role === "owner" || currentResidency?.role === "manager";
  const isSuperadmin = Boolean(user?.is_superadmin);

  const [activeSection, setActiveSection] = useState<OpSection>("residents");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Residents & Invites
  const [residents, setResidents] = useState<any[]>([]);
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteExpires, setInviteExpires] = useState("72");
  const [generatedInvite, setGeneratedInvite] = useState<any>(null);
  const [selectedBedByApplicant, setSelectedBedByApplicant] = useState<Record<string, string>>({});

  // Join Mess Portal Modal
  const [joinModal, setJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [invitePreview, setInvitePreview] = useState<any>(null);
  const [joinNid, setJoinNid] = useState("");
  const [joinProfession, setJoinProfession] = useState("");
  const [joinBloodGroup, setJoinBloodGroup] = useState("B+");
  const [joinEmergencyName, setJoinEmergencyName] = useState("");
  const [joinEmergencyPhone, setJoinEmergencyPhone] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  // Rooms & Beds
  const [beds, setBeds] = useState<any[]>([]);

  // Notices
  const [notices, setNotices] = useState<any[]>([]);
  const [noticeModal, setNoticeModal] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");
  const [noticePinned, setNoticePinned] = useState(false);

  // Complaints
  const [complaints, setComplaints] = useState<any[]>([]);
  const [complaintModal, setComplaintModal] = useState(false);
  const [complaintTitle, setComplaintTitle] = useState("");
  const [complaintDesc, setComplaintDesc] = useState("");
  const [complaintCategory, setComplaintCategory] = useState("maintenance");
  const [complaintAnon, setComplaintAnon] = useState(false);

  // Leave Clearance
  const [plannedLeaveDate, setPlannedLeaveDate] = useState("");
  const [clearanceData, setClearanceData] = useState<any>(null);
  const [messLeaves, setMessLeaves] = useState<any[]>([]);

  // Superadmin
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminMesses, setAdminMesses] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);

  useEffect(() => {
    if (currentMessId) {
      loadSectionData();
    }
  }, [currentMessId, activeSection]);

  const loadSectionData = async () => {
    setLoading(true);
    try {
      if (activeSection === "residents" && currentMessId) {
        const [res, bedsRes] = await Promise.all([
          api.getResidents(currentMessId),
          api.getBeds(currentMessId).catch(() => ({ beds: [] })),
        ]);
        setResidents(res.residents || []);
        setBeds(bedsRes.beds || []);
      } else if (activeSection === "rooms" && currentMessId) {
        const res = await api.getBeds(currentMessId);
        setBeds(res.beds || []);
      } else if (activeSection === "notices" && currentMessId) {
        const res = await api.getNotices(currentMessId);
        setNotices(res.notices || []);
      } else if (activeSection === "complaints" && currentMessId) {
        const res = await api.getComplaints(currentMessId);
        setComplaints(res.complaints || []);
      } else if (activeSection === "leave" && currentMessId) {
        if (isManager) {
          const lRes = await api.getMessLeaves(currentMessId).catch(() => null);
          if (lRes?.leaves) setMessLeaves(lRes.leaves);
        }
      } else if (activeSection === "admin" && isSuperadmin) {
        const [statsRes, messesRes, usersRes] = await Promise.all([
          api.getAdminStats(),
          api.getAdminMesses(),
          api.getAdminUsers(),
        ]);
        setAdminStats(statsRes.stats);
        setAdminMesses(messesRes.messes || []);
        setAdminUsers(usersRes.users || []);
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
    loadSectionData();
  };

  // Invite actions
  const handleGenerateInvite = async () => {
    if (!currentMessId) return;
    try {
      const res = await api.createInvite(currentMessId, {
        expires_in_hours: parseInt(inviteExpires, 10),
      });
      setGeneratedInvite(res);
      Alert.alert("Invite Generated", `Invite Code: ${res.invite.code}\nShare this code with the applicant.`);
      loadSectionData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create invite.");
    }
  };

  const handleApproveApplicant = async (code: string) => {
    try {
      await api.approveInvite(code);
      Alert.alert("Approved", "Resident activated!");
      loadSectionData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to approve applicant.");
    }
  };

  const handleApproveApplicantResidency = async (residencyId: string) => {
    try {
      const bedId = selectedBedByApplicant[residencyId] || undefined;
      await api.approveResidency(residencyId, bedId ? { bed_id: bedId } : undefined);
      Alert.alert("Approved", "Resident activated and assigned to bed!");
      loadSectionData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to approve resident.");
    }
  };

  const handleCheckInvite = async () => {
    if (!joinCode.trim()) {
      Alert.alert("Required", "Please enter invite code.");
      return;
    }
    setJoinLoading(true);
    try {
      const res = await api.getInvite(joinCode.trim());
      setInvitePreview(res.invite);
    } catch (err: any) {
      Alert.alert("Invalid Code", err.message || "Invite code not found or expired.");
    } finally {
      setJoinLoading(false);
    }
  };

  const handleSubmitJoin = async () => {
    if (!joinCode.trim()) {
      Alert.alert("Required", "Please enter invite code.");
      return;
    }
    setJoinLoading(true);
    try {
      await api.acceptInvite(joinCode.trim(), {
        nid_number: joinNid.trim() || null,
        profession: joinProfession.trim() || null,
        blood_group: joinBloodGroup || null,
        emergency_contact_name: joinEmergencyName.trim() || null,
        emergency_contact_phone: joinEmergencyPhone.trim() || null,
      });
      Alert.alert(
        "Application Submitted!",
        "Your onboarding profile has been submitted to the mess manager for approval."
      );
      setJoinModal(false);
      setJoinCode("");
      setInvitePreview(null);
      setJoinNid("");
      setJoinProfession("");
      setJoinEmergencyName("");
      setJoinEmergencyPhone("");
      await refreshUser();
      loadSectionData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to submit onboarding application.");
    } finally {
      setJoinLoading(false);
    }
  };

  const handleFinalizeClearance = async (leaveId: string) => {
    Alert.alert(
      "Finalize Clearance",
      "Are you sure you want to finalize this clearance? The resident will be marked as left and their bed vacated.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Finalize & Free Bed",
          style: "destructive",
          onPress: async () => {
            try {
              await api.finalizeClearance(leaveId);
              Alert.alert("Cleared", "Clearance completed! Bed is now empty and available.");
              loadSectionData();
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to finalize clearance.");
            }
          },
        },
      ]
    );
  };

  // Notice actions
  const handlePostNotice = async () => {
    if (!currentMessId || !noticeTitle || !noticeBody) {
      Alert.alert("Required", "Please provide title and body.");
      return;
    }
    try {
      await api.postNotice(currentMessId, {
        title: noticeTitle,
        body: noticeBody,
        is_pinned: noticePinned,
      });
      Alert.alert("Posted", "Notice published to mess board!");
      setNoticeModal(false);
      setNoticeTitle("");
      setNoticeBody("");
      loadSectionData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to post notice.");
    }
  };

  // Complaint actions
  const handleFileComplaint = async () => {
    if (!currentResidency?.id || !complaintTitle || !complaintDesc) {
      Alert.alert("Required", "Please provide title and description.");
      return;
    }
    try {
      await api.fileComplaint(currentResidency.id, {
        title: complaintTitle,
        description: complaintDesc,
        category: complaintCategory,
        is_anonymous: complaintAnon,
      });
      Alert.alert("Submitted", "Complaint logged for manager review.");
      setComplaintModal(false);
      setComplaintTitle("");
      setComplaintDesc("");
      loadSectionData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to submit complaint.");
    }
  };

  const handleResolveComplaint = async (complaintId: string) => {
    try {
      await api.updateComplaint(complaintId, { status: "resolved" });
      Alert.alert("Resolved", "Complaint marked as resolved.");
      loadSectionData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to resolve complaint.");
    }
  };

  // Leave clearance actions
  const handleSubmitLeave = async () => {
    if (!currentResidency?.id || !plannedLeaveDate) {
      Alert.alert("Required", "Please provide planned move-out date.");
      return;
    }
    try {
      const res = await api.submitLeave(currentResidency.id, {
        planned_leave_date: plannedLeaveDate,
      });
      setClearanceData(res.clearance);
      Alert.alert("Submitted", "Leave notice recorded and dues calculated.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to submit leave notice.");
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => logout() },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Profile & Mess Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.avatarText}>
            {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{user?.name}</Text>
          <Text style={styles.profileMeta}>{user?.phone || user?.email}</Text>
          <View style={styles.roleTag}>
            <Text style={styles.roleText}>{currentResidency?.role?.toUpperCase() || "RESIDENT"}</Text>
            {isSuperadmin && (
              <Text style={[styles.roleText, { backgroundColor: "#ede9fe", color: "#6d28d9" }]}>
                SUPERADMIN
              </Text>
            )}
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <TouchableOpacity
            style={styles.joinCodeBtn}
            onPress={() => setJoinModal(true)}
          >
            <Ionicons name="enter-outline" size={18} color="#059669" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Section Navigation Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sectionTabs}>
        {[
          { key: "residents", label: "Residents", icon: "people" },
          { key: "rooms", label: "Rooms & Beds", icon: "bed" },
          { key: "security", label: "Security", icon: "shield-checkmark" },
          { key: "community", label: "Trust & Match", icon: "ribbon" },
          { key: "analytics", label: "AI Analytics", icon: "sparkles" },
          { key: "notices", label: "Notices", icon: "megaphone" },
          { key: "complaints", label: "Complaints", icon: "alert-circle" },
          { key: "leave", label: "Leave Notice", icon: "exit" },
          ...(isSuperadmin ? [{ key: "admin", label: "SaaS Admin", icon: "shield-checkmark" }] : []),
        ].map((sec: any) => (
          <TouchableOpacity
            key={sec.key}
            style={[
              styles.sectionTabChip,
              activeSection === sec.key && styles.sectionTabChipActive,
            ]}
            onPress={() => setActiveSection(sec.key as OpSection)}
          >
            <Ionicons
              name={sec.icon as any}
              size={15}
              color={activeSection === sec.key ? "#ffffff" : "#4b5563"}
            />
            <Text
              style={[
                styles.sectionTabText,
                activeSection === sec.key && styles.sectionTabTextActive,
              ]}
            >
              {sec.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color="#059669" style={{ marginVertical: 30 }} />
      ) : (
        <>
          {/* SECTION 1: RESIDENTS */}
          {activeSection === "residents" && (() => {
            const pendingApplicants = residents.filter((r) => r.status === "invited");
            const activeResidents = residents.filter((r) => r.status !== "invited");
            const emptyBeds = beds.filter((b) => b.status === "empty");

            return (
              <View style={styles.contentSection}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>Resident Directory</Text>
                    <Text style={styles.sectionSub}>Active members in {currentResidency?.mess?.name}</Text>
                  </View>

                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <TouchableOpacity
                      style={styles.secondaryActionBtn}
                      onPress={() => setJoinModal(true)}
                    >
                      <Ionicons name="enter-outline" size={13} color="#059669" />
                      <Text style={styles.secondaryActionBtnText}>Join</Text>
                    </TouchableOpacity>

                    {isManager && (
                      <TouchableOpacity
                        style={styles.primaryActionBtn}
                        onPress={() => setInviteModal(true)}
                      >
                        <Ionicons name="person-add" size={13} color="#ffffff" />
                        <Text style={styles.primaryActionBtnText}>Invite</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* PENDING APPLICATIONS CARD FOR MANAGER */}
                {isManager && pendingApplicants.length > 0 && (
                  <View style={styles.pendingAppCard}>
                    <View style={styles.pendingAppHeader}>
                      <View style={styles.pulseDotOrange} />
                      <Text style={styles.pendingAppTitle}>
                        Pending Join Applications ({pendingApplicants.length})
                      </Text>
                    </View>
                    <Text style={styles.pendingAppSub}>
                      Review applicant profile & assign an available bed:
                    </Text>

                    <View style={styles.cardList}>
                      {pendingApplicants.map((app) => {
                        const p = app.profile || {};
                        const selectedBed = selectedBedByApplicant[app.id] || "";

                        return (
                          <View key={app.id} style={styles.applicantCard}>
                            <View style={styles.applicantHeaderRow}>
                              <View>
                                <Text style={styles.applicantName}>{app.user?.name || "Applicant"}</Text>
                                <Text style={styles.applicantContact}>
                                  📞 {app.user?.phone || app.user?.email || "No contact"}
                                </Text>
                              </View>
                              <View style={styles.pendingBadge}>
                                <Text style={styles.pendingBadgeText}>PENDING</Text>
                              </View>
                            </View>

                            {/* KYC Grid */}
                            <View style={styles.kycGrid}>
                              <View style={styles.kycChip}>
                                <Text style={styles.kycLabel}>NID / Student ID</Text>
                                <Text style={styles.kycVal}>{p.nid_number || "Not provided"}</Text>
                              </View>
                              <View style={styles.kycChip}>
                                <Text style={styles.kycLabel}>Blood Group</Text>
                                <Text style={[styles.kycVal, { color: "#dc2626", fontWeight: "800" }]}>
                                  {p.blood_group || "N/A"}
                                </Text>
                              </View>
                              <View style={styles.kycChip}>
                                <Text style={styles.kycLabel}>Profession</Text>
                                <Text style={styles.kycVal}>{p.profession || "Not specified"}</Text>
                              </View>
                              <View style={styles.kycChip}>
                                <Text style={styles.kycLabel}>Emergency Contact</Text>
                                <Text style={styles.kycVal}>
                                  {p.emergency_contact_name || "N/A"}{" "}
                                  {p.emergency_contact_phone && `(${p.emergency_contact_phone})`}
                                </Text>
                              </View>
                            </View>

                            {/* Bed Assignment Picker */}
                            <Text style={styles.assignBedLabel}>Select Bed to Assign:</Text>
                            {emptyBeds.length === 0 ? (
                              <Text style={styles.noBedsText}>No empty beds available in mess.</Text>
                            ) : (
                              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                                {emptyBeds.map((bed) => (
                                  <TouchableOpacity
                                    key={bed.id}
                                    style={[
                                      styles.bedPickChip,
                                      selectedBed === bed.id && styles.bedPickChipActive,
                                    ]}
                                    onPress={() =>
                                      setSelectedBedByApplicant((prev) => ({
                                        ...prev,
                                        [app.id]: bed.id,
                                      }))
                                    }
                                  >
                                    <Ionicons
                                      name="bed-outline"
                                      size={14}
                                      color={selectedBed === bed.id ? "#065f46" : "#4b5563"}
                                    />
                                    <Text
                                      style={[
                                        styles.bedPickText,
                                        selectedBed === bed.id && styles.bedPickTextActive,
                                      ]}
                                    >
                                      {bed.label} ({bed.room?.name || "Room"})
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </ScrollView>
                            )}

                            {/* 1-Click Approve Button */}
                            <TouchableOpacity
                              style={styles.approveApplicantBtn}
                              onPress={() => handleApproveApplicantResidency(app.id)}
                            >
                              <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
                              <Text style={styles.approveApplicantBtnText}>
                                Approve & Assign Bed {selectedBed && `(${emptyBeds.find((b) => b.id === selectedBed)?.label})`}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* ACTIVE RESIDENTS DIRECTORY */}
                <Text style={[styles.sectionTitle, { marginTop: isManager && pendingApplicants.length > 0 ? 10 : 0 }]}>
                  Active Residents ({activeResidents.length})
                </Text>

                <View style={styles.cardList}>
                  {activeResidents.map((r) => (
                    <View key={r.id} style={styles.itemCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>{r.user?.name || "Resident"}</Text>
                        <Text style={styles.itemSub}>
                          📞 {r.user?.phone || r.user?.email || "No contact"}
                        </Text>
                        <Text style={styles.itemMeta}>
                          Bed: {r.bed?.label || "Unassigned"} • Role:{" "}
                          <Text style={{ textTransform: "capitalize", fontWeight: "700" }}>{r.role}</Text>
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusPill,
                          r.status === "active" ? styles.statusActive : styles.statusInvited,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            r.status === "active" ? styles.statusTextActive : styles.statusTextInvited,
                          ]}
                        >
                          {r.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            );
          })()}

          {/* SECTION 2: ROOMS & BEDS */}
          {activeSection === "rooms" && (
            <View style={styles.contentSection}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>Beds & Occupancy</Text>
                  <Text style={styles.sectionSub}>Bed layout and occupancy status</Text>
                </View>
              </View>

              <View style={styles.bedGrid}>
                {beds.map((b) => (
                  <View
                    key={b.id}
                    style={[
                      styles.bedCard,
                      b.status === "occupied" ? styles.bedCardOccupied : styles.bedCardEmpty,
                    ]}
                  >
                    <Ionicons
                      name="bed"
                      size={24}
                      color={b.status === "occupied" ? "#059669" : "#9ca3af"}
                    />
                    <Text style={styles.bedLabel}>{b.label}</Text>
                    <Text style={styles.bedRoomText}>Room: {b.room?.name || "Room"}</Text>
                    <View
                      style={[
                        styles.bedStatusTag,
                        b.status === "occupied" ? styles.bedStatusOccupied : styles.bedStatusEmpty,
                      ]}
                    >
                      <Text
                        style={[
                          styles.bedStatusText,
                          b.status === "occupied"
                            ? styles.bedStatusTextOccupied
                            : styles.bedStatusTextEmpty,
                        ]}
                      >
                        {b.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* SECTION 3: NOTICES */}
          {activeSection === "notices" && (
            <View style={styles.contentSection}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>Mess Notices</Text>
                  <Text style={styles.sectionSub}>Announcements & updates</Text>
                </View>

                {isManager && (
                  <TouchableOpacity
                    style={styles.primaryActionBtn}
                    onPress={() => setNoticeModal(true)}
                  >
                    <Ionicons name="add" size={14} color="#ffffff" />
                    <Text style={styles.primaryActionBtnText}>Post</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.cardList}>
                {notices.map((n) => (
                  <View key={n.id} style={[styles.itemCard, n.is_pinned && styles.pinnedItemCard]}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      {n.is_pinned && (
                        <View style={styles.pinnedChip}>
                          <Ionicons name="pin" size={10} color="#b45309" />
                          <Text style={styles.pinnedChipText}>PINNED</Text>
                        </View>
                      )}
                      <Text style={styles.noticeDateText}>
                        {new Date(n.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.itemTitle}>{n.title}</Text>
                    <Text style={styles.noticeBodyText}>{n.body}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* SECTION 4: COMPLAINTS */}
          {activeSection === "complaints" && (
            <View style={styles.contentSection}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>Complaints & Maintenance</Text>
                  <Text style={styles.sectionSub}>Report facility and community issues</Text>
                </View>

                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={() => setComplaintModal(true)}
                >
                  <Ionicons name="add" size={14} color="#ffffff" />
                  <Text style={styles.primaryActionBtnText}>Report</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cardList}>
                {complaints.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="checkmark-circle-outline" size={40} color="#059669" />
                    <Text style={styles.emptyTitle}>No Complaints</Text>
                    <Text style={styles.emptySub}>All facilities functioning smoothly.</Text>
                  </View>
                ) : (
                  complaints.map((c) => (
                    <View key={c.id} style={styles.itemCard}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={styles.itemTitle}>{c.title}</Text>
                        <View
                          style={[
                            styles.statusPill,
                            c.status === "resolved" ? styles.statusActive : styles.statusInvited,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusPillText,
                              c.status === "resolved" ? styles.statusTextActive : styles.statusTextInvited,
                            ]}
                          >
                            {c.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.noticeBodyText}>{c.description}</Text>

                      {isManager && c.status === "open" && (
                        <TouchableOpacity
                          style={styles.resolveBtn}
                          onPress={() => handleResolveComplaint(c.id)}
                        >
                          <Ionicons name="checkmark" size={14} color="#ffffff" />
                          <Text style={styles.resolveBtnText}>Mark Resolved</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                )}
              </View>
            </View>
          )}

          {/* SECTION 5: LEAVE CLEARANCE */}
          {activeSection === "leave" && (
            <View style={styles.contentSection}>
              <Text style={styles.sectionTitle}>Move-Out & Clearance</Text>
              <Text style={styles.sectionSub}>
                Submit your planned move-out date for dues clearance and security deposit refund.
              </Text>

              <View style={styles.leaveCard}>
                <Text style={styles.inputLabel}>Planned Move-out Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 2026-10-31"
                  value={plannedLeaveDate}
                  onChangeText={setPlannedLeaveDate}
                />

                <TouchableOpacity style={styles.submitLeaveBtn} onPress={handleSubmitLeave}>
                  <Text style={styles.submitLeaveText}>Submit Notice & Calculate Settlement</Text>
                </TouchableOpacity>

                {clearanceData && (
                  <View style={styles.clearanceBox}>
                    <Text style={styles.clearanceTitle}>Clearance Statement</Text>
                    <Text style={styles.clearanceRow}>
                      Final Unpaid Dues: ৳{Number(clearanceData.final_dues || 0).toFixed(2)}
                    </Text>
                    <Text style={styles.clearanceRowRefund}>
                      Estimated Deposit Refund: ৳{Number(clearanceData.deposit_refunded || 0).toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Manager Clearance Reviews */}
              {isManager && (
                <View style={{ marginTop: 20 }}>
                  <Text style={styles.sectionTitle}>Manager Clearance Reviews</Text>
                  <Text style={styles.sectionSub}>Review pending move-out notices and finalize clearance</Text>

                  {messLeaves.length === 0 ? (
                    <View style={[styles.emptyCard, { marginTop: 10 }]}>
                      <Ionicons name="checkmark-done-circle-outline" size={38} color="#059669" />
                      <Text style={styles.emptyTitle}>No Pending Clearances</Text>
                      <Text style={styles.emptySub}>All resident move-out notices are cleared.</Text>
                    </View>
                  ) : (
                    <View style={[styles.cardList, { marginTop: 10 }]}>
                      {messLeaves.map((l: any) => {
                        const isCleared = l.status === "cleared";
                        const resName = l.residency?.user?.name || "Resident";
                        const bedLabel = l.residency?.bed?.label || "Unassigned";

                        return (
                          <View key={l.id} style={styles.itemCard}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <View>
                                <Text style={styles.itemTitle}>{resName}</Text>
                                <Text style={styles.itemSub}>Bed: {bedLabel} • Move-out: {l.planned_leave_date}</Text>
                              </View>

                              <View style={[styles.statusPill, isCleared ? styles.statusActive : styles.statusInvited]}>
                                <Text style={[styles.statusPillText, isCleared ? styles.statusTextActive : styles.statusTextInvited]}>
                                  {l.status.toUpperCase()}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.clearanceBoxMini}>
                              <Text style={styles.clearanceRowMini}>
                                Final Dues: <Text style={{ fontWeight: "700", color: "#dc2626" }}>৳{Number(l.final_dues || 0).toFixed(2)}</Text>
                              </Text>
                              <Text style={styles.clearanceRowMini}>
                                Deposit Refund: <Text style={{ fontWeight: "700", color: "#059669" }}>৳{Number(l.deposit_refunded || 0).toFixed(2)}</Text>
                              </Text>
                            </View>

                            {!isCleared && (
                              <TouchableOpacity
                                style={styles.finalizeBtn}
                                onPress={() => handleFinalizeClearance(l.id)}
                              >
                                <Ionicons name="shield-checkmark" size={14} color="#ffffff" />
                                <Text style={styles.finalizeBtnText}>Finalize Clearance & Vacate Bed</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* SECTION 6: SAAS SUPERADMIN */}
          {activeSection === "admin" && isSuperadmin && (
            <View style={styles.contentSection}>
              <Text style={styles.sectionTitle}>👑 Platform Command Center</Text>
              <Text style={styles.sectionSub}>Master SaaS controls across Bangladesh</Text>

              <View style={styles.adminStatsRow}>
                <View style={styles.adminStatCard}>
                  <Text style={styles.adminStatNum}>{adminStats?.total_messes ?? 0}</Text>
                  <Text style={styles.adminStatLabel}>Messes</Text>
                </View>
                <View style={styles.adminStatCard}>
                  <Text style={styles.adminStatNum}>{adminStats?.total_users ?? 0}</Text>
                  <Text style={styles.adminStatLabel}>Users</Text>
                </View>
                <View style={styles.adminStatCard}>
                  <Text style={styles.adminStatNum}>{adminStats?.total_active_residencies ?? 0}</Text>
                  <Text style={styles.adminStatLabel}>Residents</Text>
                </View>
              </View>

              <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Messes Management</Text>
              <View style={styles.cardList}>
                {adminMesses.map((m) => (
                  <View key={m.id} style={styles.itemCard}>
                    <Text style={styles.itemTitle}>{m.name}</Text>
                    <Text style={styles.itemSub}>{m.city} • Owner: {m.owner?.name}</Text>
                    <View style={styles.adminMessActions}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#059669" }}>
                        Status: {m.status.toUpperCase()}
                      </Text>
                      <TouchableOpacity
                        style={styles.impersonateBtn}
                        onPress={async () => {
                          try {
                            const res = await api.impersonateMess(m.id);
                            Alert.alert("Success", `Entered ${m.name} as owner.`);
                          } catch (err: any) {
                            Alert.alert("Error", err.message || "Failed.");
                          }
                        }}
                      >
                        <Text style={styles.impersonateText}>Enter as Owner</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* SECTION: SMART SECURITY (#36, #37, #38) */}
          {activeSection === "security" && <SecuritySection />}

          {/* SECTION: TRUST & COMMUNITY (#39, #40, #41) */}
          {activeSection === "community" && <CommunitySection />}

          {/* SECTION: AI & ADVANCED ANALYTICS (#42 to #46) */}
          {activeSection === "analytics" && <AnalyticsSection />}
        </>
      )}

      {/* Invite Modal */}
      <Modal visible={inviteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Generate Invite Code</Text>
              <TouchableOpacity onPress={() => setInviteModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Generate an onboarding code for new applicants to join this mess.
            </Text>

            <Text style={styles.inputLabel}>Expires In (Hours)</Text>
            <TextInput
              style={styles.modalInput}
              value={inviteExpires}
              onChangeText={setInviteExpires}
              keyboardType="numeric"
            />

            <TouchableOpacity style={styles.modalSubmitButton} onPress={handleGenerateInvite}>
              <Text style={styles.modalSubmitText}>Generate Code</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Notice Modal */}
      <Modal visible={noticeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Post Mess Notice</Text>
              <TouchableOpacity onPress={() => setNoticeModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Notice Title</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. WiFi Bill Reminder"
              value={noticeTitle}
              onChangeText={setNoticeTitle}
            />

            <Text style={styles.inputLabel}>Body / Content</Text>
            <TextInput
              style={[styles.modalInput, { height: 70 }]}
              placeholder="Notice description..."
              value={noticeBody}
              onChangeText={setNoticeBody}
              multiline
            />

            <View style={styles.switchRow}>
              <Text style={styles.inputLabel}>Pin to top</Text>
              <Switch value={noticePinned} onValueChange={setNoticePinned} />
            </View>

            <TouchableOpacity style={styles.modalSubmitButton} onPress={handlePostNotice}>
              <Text style={styles.modalSubmitText}>Publish Notice</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Complaint Modal */}
      <Modal visible={complaintModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>File a Complaint</Text>
              <TouchableOpacity onPress={() => setComplaintModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Water purifier leaking"
              value={complaintTitle}
              onChangeText={setComplaintTitle}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.modalInput, { height: 70 }]}
              placeholder="Describe the issue in detail..."
              value={complaintDesc}
              onChangeText={setComplaintDesc}
              multiline
            />

            <View style={styles.switchRow}>
              <Text style={styles.inputLabel}>Anonymous Submission</Text>
              <Switch value={complaintAnon} onValueChange={setComplaintAnon} />
            </View>

            <TouchableOpacity style={styles.modalSubmitButton} onPress={handleFileComplaint}>
              <Text style={styles.modalSubmitText}>Submit Complaint</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Join Mess Modal */}
      <Modal visible={joinModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "90%" }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Join a Mess</Text>
                <TouchableOpacity onPress={() => setJoinModal(false)}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalDesc}>
                Enter an invite code provided by the mess manager, inspect mess details, and submit your KYC onboarding profile.
              </Text>

              <Text style={styles.inputLabel}>Invite Code (8 characters)</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  style={[styles.modalInput, { flex: 1, textTransform: "uppercase", fontWeight: "700" }]}
                  placeholder="e.g. 5D853A37"
                  value={joinCode}
                  onChangeText={setJoinCode}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={styles.checkCodeBtn}
                  onPress={handleCheckInvite}
                  disabled={joinLoading}
                >
                  <Text style={styles.checkCodeBtnText}>Check</Text>
                </TouchableOpacity>
              </View>

              {invitePreview && (
                <View style={styles.invitePreviewCard}>
                  <Text style={styles.previewMessName}>{invitePreview.mess?.name}</Text>
                  <Text style={styles.previewMessAddr}>
                    📍 {invitePreview.mess?.address}, {invitePreview.mess?.city}
                  </Text>
                  <Text style={styles.previewRole}>
                    Role: <Text style={{ fontWeight: "800", color: "#059669" }}>{invitePreview.role?.toUpperCase()}</Text>
                  </Text>
                </View>
              )}

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>National ID (NID) / Student ID</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 19982692... or SID-12345"
                value={joinNid}
                onChangeText={setJoinNid}
              />

              <Text style={styles.inputLabel}>Profession / University</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Software Engineer / BUET"
                value={joinProfession}
                onChangeText={setJoinProfession}
              />

              <Text style={styles.inputLabel}>Blood Group</Text>
              <View style={styles.bloodGroupRow}>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                  <TouchableOpacity
                    key={bg}
                    style={[styles.bloodChip, joinBloodGroup === bg && styles.bloodChipActive]}
                    onPress={() => setJoinBloodGroup(bg)}
                  >
                    <Text
                      style={[
                        styles.bloodChipText,
                        joinBloodGroup === bg && styles.bloodChipTextActive,
                      ]}
                    >
                      {bg}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Emergency Contact Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Father / Brother name"
                value={joinEmergencyName}
                onChangeText={setJoinEmergencyName}
              />

              <Text style={styles.inputLabel}>Emergency Contact Phone</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="01700000000"
                value={joinEmergencyPhone}
                onChangeText={setJoinEmergencyPhone}
                keyboardType="phone-pad"
              />

              <TouchableOpacity
                style={[styles.modalSubmitButton, joinLoading && { opacity: 0.6 }]}
                onPress={handleSubmitJoin}
                disabled={joinLoading}
              >
                {joinLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit Onboarding Application</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
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
    paddingBottom: 36,
  },
  profileCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#065f46",
  },
  profileName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  profileMeta: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 1,
  },
  roleTag: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  roleText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#059669",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  signOutBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#fee2e2",
  },
  sectionTabs: {
    flexDirection: "row",
    marginBottom: 16,
  },
  sectionTabChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
  },
  sectionTabChipActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  sectionTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4b5563",
  },
  sectionTabTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  contentSection: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  sectionSub: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 1,
  },
  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#059669",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  primaryActionBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  cardList: {
    gap: 10,
  },
  itemCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  pinnedItemCard: {
    borderColor: "#fde68a",
    backgroundColor: "#fffbeb",
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  itemSub: {
    fontSize: 12,
    color: "#4b5563",
    marginTop: 2,
  },
  itemMeta: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 4,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  statusActive: {
    backgroundColor: "#d1fae5",
  },
  statusInvited: {
    backgroundColor: "#fef3c7",
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: "800",
  },
  statusTextActive: {
    color: "#065f46",
  },
  statusTextInvited: {
    color: "#92400e",
  },
  bedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  bedCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  bedCardOccupied: {
    borderColor: "#a7f3d0",
  },
  bedCardEmpty: {
    borderColor: "#e5e7eb",
  },
  bedLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginTop: 6,
  },
  bedRoomText: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  bedStatusTag: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bedStatusOccupied: {
    backgroundColor: "#d1fae5",
  },
  bedStatusEmpty: {
    backgroundColor: "#f3f4f6",
  },
  bedStatusText: {
    fontSize: 9,
    fontWeight: "800",
  },
  bedStatusTextOccupied: {
    color: "#065f46",
  },
  bedStatusTextEmpty: {
    color: "#6b7280",
  },
  pinnedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pinnedChipText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#b45309",
  },
  noticeDateText: {
    fontSize: 11,
    color: "#9ca3af",
  },
  noticeBodyText: {
    fontSize: 13,
    color: "#4b5563",
    marginTop: 4,
    lineHeight: 18,
  },
  resolveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#059669",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: "flex-end",
    marginTop: 8,
  },
  resolveBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  leaveCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  submitLeaveBtn: {
    backgroundColor: "#7c3aed",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  submitLeaveText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  clearanceBox: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: 14,
    gap: 6,
  },
  clearanceTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  clearanceRow: {
    fontSize: 12,
    color: "#4b5563",
  },
  clearanceRowRefund: {
    fontSize: 13,
    fontWeight: "800",
    color: "#059669",
  },
  adminStatsRow: {
    flexDirection: "row",
    gap: 8,
  },
  adminStatCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  adminStatNum: {
    fontSize: 20,
    fontWeight: "900",
    color: "#4f46e5",
  },
  adminStatLabel: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "600",
    marginTop: 2,
  },
  adminMessActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  impersonateBtn: {
    backgroundColor: "#4f46e5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  impersonateText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
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
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginTop: 8,
    marginBottom: 4,
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
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
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
  joinCodeBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#d1fae5",
  },
  secondaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  secondaryActionBtnText: {
    color: "#065f46",
    fontSize: 12,
    fontWeight: "700",
  },
  pendingAppCard: {
    backgroundColor: "#fffbeb",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#fde68a",
    marginBottom: 10,
  },
  pendingAppHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pulseDotOrange: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f59e0b",
  },
  pendingAppTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#92400e",
  },
  pendingAppSub: {
    fontSize: 11,
    color: "#b45309",
    marginTop: 2,
    marginBottom: 10,
  },
  applicantCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  applicantHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  applicantName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  applicantContact: {
    fontSize: 12,
    color: "#4b5563",
    marginTop: 2,
  },
  pendingBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pendingBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#b45309",
  },
  kycGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  kycChip: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    width: "48%",
  },
  kycLabel: {
    fontSize: 9,
    color: "#6b7280",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  kycVal: {
    fontSize: 11,
    color: "#111827",
    fontWeight: "700",
    marginTop: 1,
  },
  assignBedLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
    marginTop: 10,
  },
  noBedsText: {
    fontSize: 11,
    color: "#dc2626",
    fontStyle: "italic",
    marginVertical: 4,
  },
  bedPickChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  bedPickChipActive: {
    backgroundColor: "#d1fae5",
    borderColor: "#10b981",
  },
  bedPickText: {
    fontSize: 11,
    color: "#4b5563",
    fontWeight: "600",
  },
  bedPickTextActive: {
    color: "#065f46",
    fontWeight: "800",
  },
  approveApplicantBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#059669",
    borderRadius: 10,
    paddingVertical: 9,
    marginTop: 10,
  },
  approveApplicantBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  clearanceBoxMini: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: "#f9fafb",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  clearanceRowMini: {
    fontSize: 12,
    color: "#4b5563",
  },
  finalizeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#7c3aed",
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
  },
  finalizeBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  checkCodeBtn: {
    backgroundColor: "#059669",
    paddingHorizontal: 16,
    justifyContent: "center",
    borderRadius: 10,
  },
  checkCodeBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  invitePreviewCard: {
    backgroundColor: "#ecfdf5",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    marginTop: 10,
  },
  previewMessName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#065f46",
  },
  previewMessAddr: {
    fontSize: 12,
    color: "#047857",
    marginTop: 2,
  },
  previewRole: {
    fontSize: 11,
    color: "#374151",
    marginTop: 4,
  },
  bloodGroupRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  bloodChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  bloodChipActive: {
    backgroundColor: "#fee2e2",
    borderColor: "#ef4444",
  },
  bloodChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4b5563",
  },
  bloodChipTextActive: {
    color: "#dc2626",
  },
});
