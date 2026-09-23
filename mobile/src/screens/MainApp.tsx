import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DashboardScreen } from "./DashboardScreen";
import { MealsScreen } from "./MealsScreen";
import { ExpensesScreen } from "./ExpensesScreen";
import { BillsScreen } from "./BillsScreen";
import { MarketplaceScreen } from "./MarketplaceScreen";
import { OperationsScreen } from "./OperationsScreen";

type TabKey = "home" | "meals" | "expenses" | "bills" | "marketplace" | "more";

export function MainApp() {
  const [activeTab, setActiveTab] = useState<TabKey>("home");

  const tabs: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "home", label: "Home", icon: "home-outline" },
    { key: "meals", label: "Meals", icon: "restaurant-outline" },
    { key: "expenses", label: "Bazar", icon: "cart-outline" },
    { key: "bills", label: "Bills", icon: "receipt-outline" },
    { key: "marketplace", label: "Market", icon: "compass-outline" },
    { key: "more", label: "More", icon: "grid-outline" },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Screen Content */}
      <View style={styles.screenContainer}>
        {activeTab === "home" && <DashboardScreen />}
        {activeTab === "meals" && <MealsScreen />}
        {activeTab === "expenses" && <ExpensesScreen />}
        {activeTab === "bills" && <BillsScreen />}
        {activeTab === "marketplace" && <MarketplaceScreen />}
        {activeTab === "more" && <OperationsScreen />}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon}
                size={22}
                color={isActive ? "#059669" : "#9ca3af"}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? "#059669" : "#9ca3af", fontWeight: isActive ? "800" : "500" },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingVertical: 8,
    paddingBottom: Platform.OS === "ios" ? 18 : 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 3,
  },
});
