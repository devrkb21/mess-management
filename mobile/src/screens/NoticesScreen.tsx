import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

export function NoticesScreen() {
  const { currentMessId, currentResidency, user, logout } = useAuth();
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (currentMessId) {
      loadNotices();
    } else {
      setLoading(false);
    }
  }, [currentMessId]);

  const loadNotices = async () => {
    if (!currentMessId) return;
    try {
      const res = await api.getNotices(currentMessId);
      setNotices(res.notices || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotices();
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out from this device?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Resident Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.avatarLetter}>
            {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          </Text>
        </View>

        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name}</Text>
          <Text style={styles.profilePhone}>{user?.phone || user?.email}</Text>
          <View style={styles.roleTag}>
            <Text style={styles.roleTagText}>
              {currentResidency?.role?.toUpperCase() || "RESIDENT"}
            </Text>
            {currentResidency?.bed && (
              <Text style={styles.bedTagText}> • Bed: {currentResidency.bed.label}</Text>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
        </TouchableOpacity>
      </View>

      {/* Notices Header */}
      <View style={styles.noticesHeader}>
        <Text style={styles.sectionTitle}>Mess Notice Board (বিজ্ঞপ্তি)</Text>
        <Text style={styles.sectionSub}>Official announcements from mess management</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#059669" style={{ marginVertical: 40 }} />
      ) : notices.length === 0 ? (
        <View style={styles.emptyNoticeCard}>
          <Ionicons name="notifications-off-outline" size={40} color="#9ca3af" />
          <Text style={styles.emptyNoticeTitle}>No Notices Posted</Text>
          <Text style={styles.emptyNoticeSub}>
            New notices from manager will appear here in real-time.
          </Text>
        </View>
      ) : (
        <View style={styles.noticeList}>
          {notices.map((notice) => (
            <View
              key={notice.id}
              style={[styles.noticeCard, notice.is_pinned && styles.noticeCardPinned]}
            >
              <View style={styles.noticeTop}>
                {notice.is_pinned && (
                  <View style={styles.pinnedBadge}>
                    <Ionicons name="pin" size={12} color="#b45309" />
                    <Text style={styles.pinnedText}>PINNED</Text>
                  </View>
                )}
                <Text style={styles.noticeDate}>
                  {new Date(notice.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              </View>

              <Text style={styles.noticeTitle}>{notice.title}</Text>
              <Text style={styles.noticeBody}>{notice.body}</Text>
            </View>
          ))}
        </View>
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
  profileCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarLetter: {
    fontSize: 22,
    fontWeight: "800",
    color: "#065f46",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  profilePhone: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  roleTag: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bedTagText: {
    fontSize: 11,
    color: "#4b5563",
    fontWeight: "600",
  },
  logoutButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#fee2e2",
  },
  noticesHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  sectionSub: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  noticeList: {
    gap: 12,
  },
  noticeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  noticeCardPinned: {
    borderColor: "#fde68a",
    backgroundColor: "#fffbeb",
  },
  noticeTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  pinnedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pinnedText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#b45309",
  },
  noticeDate: {
    fontSize: 11,
    color: "#9ca3af",
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  noticeBody: {
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 18,
  },
  emptyNoticeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: 10,
  },
  emptyNoticeTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginTop: 10,
  },
  emptyNoticeSub: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 4,
  },
});
