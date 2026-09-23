import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

export function BillsScreen() {
  const { currentResidency, currentMessId, user } = useAuth();
  const isManager = currentResidency?.role === "owner" || currentResidency?.role === "manager";

  const [bills, setBills] = useState<any[]>([]);
  const [messBills, setMessBills] = useState<any[]>([]);
  const [messBillsSummary, setMessBillsSummary] = useState({ totalBilled: 0, totalCollected: 0, totalDues: 0 });
  const [billTab, setBillTab] = useState<"my" | "all">("my");
  const [selectedMonth, setSelectedMonth] = useState(() =>
    new Date().toISOString().substring(0, 7)
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Invoice Detail Modal State
  const [invoiceModalBill, setInvoiceModalBill] = useState<any>(null);

  // Payment Modal State
  const [paymentModal, setPaymentModal] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  useEffect(() => {
    if (currentResidency?.id) {
      loadBills();
    } else {
      setLoading(false);
    }
  }, [currentResidency, selectedMonth]);

  const loadBills = async () => {
    if (!currentResidency?.id) return;
    try {
      const res = await api.getResidentBills(currentResidency.id);
      setBills(res.bills || []);

      if (isManager && currentMessId) {
        const mRes = await api.getMessBills(currentMessId, selectedMonth).catch(() => null);
        if (mRes?.bills) {
          setMessBills(mRes.bills);
          const totalBilled = mRes.bills.reduce((sum: number, b: any) => sum + Number(b.total_payable || 0), 0);
          const totalCollected = mRes.bills.reduce((sum: number, b: any) => sum + Number(b.paid_amount || 0), 0);
          const totalDues = mRes.bills.reduce((sum: number, b: any) => sum + Number(b.remaining_due || 0), 0);
          setMessBillsSummary({ totalBilled, totalCollected, totalDues });
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
    loadBills();
  };

  const handleGenerateBills = async () => {
    if (!currentMessId) return;
    setGenerating(true);
    try {
      const res = await api.generateBills(currentMessId, selectedMonth);
      Alert.alert("Generated", `Successfully generated bills for ${res.bills_count} residents!`);
      loadBills();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to generate monthly bills.");
    } finally {
      setGenerating(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentModal || !paymentAmount) {
      Alert.alert("Required", "Please enter the payment amount.");
      return;
    }
    setPaymentSubmitting(true);
    try {
      await api.recordPayment(paymentModal.id, {
        amount: parseFloat(paymentAmount),
        method: paymentMethod,
        paid_at: new Date().toISOString().split("T")[0],
        note: paymentNote || null,
      });
      Alert.alert("Success", "Payment recorded successfully! Bill status updated.");
      setPaymentModal(null);
      setPaymentAmount("");
      setPaymentNote("");
      loadBills();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to record payment.");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Monthly Invoices & Dues</Text>
          <Text style={styles.subtitle}>
            Itemized breakdown of meals, fixed utility shares, and dues.
          </Text>
        </View>

        {isManager && (
          <TouchableOpacity
            style={styles.generateBtn}
            onPress={handleGenerateBills}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="sparkles" size={14} color="#ffffff" />
                <Text style={styles.generateBtnText}>Gen Bills</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Manager Tab Segment */}
      {isManager && (
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, billTab === "my" && styles.segmentBtnActive]}
            onPress={() => setBillTab("my")}
          >
            <Text style={[styles.segmentBtnText, billTab === "my" && styles.segmentBtnTextActive]}>
              My Invoices ({bills.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, billTab === "all" && styles.segmentBtnActive]}
            onPress={() => setBillTab("all")}
          >
            <Text style={[styles.segmentBtnText, billTab === "all" && styles.segmentBtnTextActive]}>
              All Resident Bills ({messBills.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#059669" style={{ marginVertical: 40 }} />
      ) : billTab === "all" && isManager ? (
        /* ALL RESIDENT BILLS (MANAGER VIEW) */
        <View style={{ gap: 14 }}>
          {/* Summary Stat Row */}
          <View style={styles.summaryStatsRow}>
            <View style={styles.summaryStatBox}>
              <Text style={styles.summaryStatLabel}>Invoices</Text>
              <Text style={styles.summaryStatValue}>{messBills.length}</Text>
            </View>
            <View style={styles.summaryStatBox}>
              <Text style={styles.summaryStatLabel}>Total Billed</Text>
              <Text style={styles.summaryStatValue}>৳{messBillsSummary.totalBilled.toFixed(0)}</Text>
            </View>
            <View style={styles.summaryStatBox}>
              <Text style={styles.summaryStatLabel}>Collected</Text>
              <Text style={[styles.summaryStatValue, { color: "#059669" }]}>
                ৳{messBillsSummary.totalCollected.toFixed(0)}
              </Text>
            </View>
            <View style={styles.summaryStatBox}>
              <Text style={styles.summaryStatLabel}>Dues</Text>
              <Text style={[styles.summaryStatValue, { color: "#dc2626" }]}>
                ৳{messBillsSummary.totalDues.toFixed(0)}
              </Text>
            </View>
          </View>

          {messBills.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyTitle}>No Bills Generated</Text>
              <Text style={styles.emptySubtitle}>
                Tap 'Gen Bills' above to calculate and issue monthly bills for all residents.
              </Text>
            </View>
          ) : (
            <View style={styles.billList}>
              {messBills.map((bill) => {
                const isPaid = bill.status === "paid";
                const isPartial = bill.status === "partially_paid";
                const remainingDue = bill.remaining_due ?? bill.total_payable;
                const resName = bill.residency?.user?.name || "Resident";
                const bedLabel = bill.residency?.bed?.label || "Unassigned";

                return (
                  <View key={bill.id} style={styles.billCard}>
                    <View style={styles.billCardHeader}>
                      <View>
                        <Text style={styles.residentBillName}>{resName}</Text>
                        <Text style={styles.invoiceNumber}>
                          Bed: {bedLabel} • #{bill.id.substring(0, 8)}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          isPaid
                            ? styles.statusPaid
                            : isPartial
                            ? styles.statusPartial
                            : styles.statusIssued,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            isPaid
                              ? styles.statusTextPaid
                              : isPartial
                              ? styles.statusTextPartial
                              : styles.statusTextIssued,
                          ]}
                        >
                          {bill.status.toUpperCase().replace("_", " ")}
                        </Text>
                      </View>
                    </View>

                    {/* Breakdown */}
                    <View style={styles.billDetails}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>
                          Meals ({bill.total_meals || 0})
                        </Text>
                        <Text style={styles.detailValue}>
                          ৳{Number(bill.meal_cost_total || 0).toFixed(2)}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Fixed Share</Text>
                        <Text style={styles.detailValue}>
                          ৳{Number(bill.fixed_bill_share_total || 0).toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    {/* Footer */}
                    <View style={styles.billFooter}>
                      <View>
                        <Text style={styles.totalLabel}>Payable</Text>
                        <Text style={styles.totalValue}>
                          ৳{Number(bill.total_payable || 0).toFixed(2)}
                        </Text>
                      </View>

                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.dueLabel}>Remaining Due</Text>
                        <Text
                          style={[
                            styles.dueValue,
                            remainingDue > 0 ? { color: "#dc2626" } : { color: "#059669" },
                          ]}
                        >
                          ৳{Number(remainingDue).toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.billActionsRow}>
                      <TouchableOpacity
                        style={styles.viewInvoiceBtn}
                        onPress={() => setInvoiceModalBill(bill)}
                      >
                        <Ionicons name="document-text-outline" size={15} color="#4b5563" />
                        <Text style={styles.viewInvoiceBtnText}>View Receipt</Text>
                      </TouchableOpacity>

                      {!isPaid && (
                        <TouchableOpacity
                          style={styles.recordPayBtn}
                          onPress={() => {
                            setPaymentModal(bill);
                            setPaymentAmount(String(remainingDue));
                          }}
                        >
                          <Ionicons name="card-outline" size={15} color="#059669" />
                          <Text style={styles.recordPayText}>Log Payment</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      ) : bills.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="receipt-outline" size={48} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No Invoices Yet</Text>
          <Text style={styles.emptySubtitle}>
            Your manager will generate monthly invoices at the end of the billing cycle.
          </Text>
        </View>
      ) : (
        /* MY INVOICES */
        <View style={styles.billList}>
          {bills.map((bill) => {
            const isPaid = bill.status === "paid";
            const isPartial = bill.status === "partially_paid";
            const remainingDue = bill.remaining_due ?? bill.total_payable;

            return (
              <View key={bill.id} style={styles.billCard}>
                <View style={styles.billCardHeader}>
                  <View>
                    <Text style={styles.billingMonth}>{bill.billing_month}</Text>
                    <Text style={styles.invoiceNumber}>Invoice #{bill.id.substring(0, 8)}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      isPaid
                        ? styles.statusPaid
                        : isPartial
                        ? styles.statusPartial
                        : styles.statusIssued,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        isPaid
                          ? styles.statusTextPaid
                          : isPartial
                          ? styles.statusTextPartial
                          : styles.statusTextIssued,
                      ]}
                    >
                      {bill.status.toUpperCase().replace("_", " ")}
                    </Text>
                  </View>
                </View>

                {/* Line Items */}
                <View style={styles.billDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Meal Cost Total</Text>
                    <Text style={styles.detailValue}>
                      ৳{Number(bill.meal_cost_total || 0).toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Fixed Shared Bills</Text>
                    <Text style={styles.detailValue}>
                      ৳{Number(bill.fixed_bill_share_total || 0).toFixed(2)}
                    </Text>
                  </View>

                  {Number(bill.previous_due || 0) > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Previous Dues</Text>
                      <Text style={[styles.detailValue, { color: "#dc2626" }]}>
                        ৳{Number(bill.previous_due).toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Footer Total */}
                <View style={styles.billFooter}>
                  <View>
                    <Text style={styles.totalLabel}>Total Payable</Text>
                    <Text style={styles.totalValue}>
                      ৳{Number(bill.total_payable || 0).toFixed(2)}
                    </Text>
                  </View>

                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.dueLabel}>Remaining Due</Text>
                    <Text
                      style={[
                        styles.dueValue,
                        remainingDue > 0 ? { color: "#dc2626" } : { color: "#059669" },
                      ]}
                    >
                      ৳{Number(remainingDue).toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.billActionsRow}>
                  <TouchableOpacity
                    style={styles.viewInvoiceBtn}
                    onPress={() => setInvoiceModalBill(bill)}
                  >
                    <Ionicons name="document-text-outline" size={15} color="#4b5563" />
                    <Text style={styles.viewInvoiceBtnText}>View Receipt</Text>
                  </TouchableOpacity>

                  {isManager && !isPaid && (
                    <TouchableOpacity
                      style={styles.recordPayBtn}
                      onPress={() => {
                        setPaymentModal(bill);
                        setPaymentAmount(String(remainingDue));
                      }}
                    >
                      <Ionicons name="card-outline" size={15} color="#059669" />
                      <Text style={styles.recordPayText}>Log Payment</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Itemized Printable Invoice Modal */}
      <Modal visible={Boolean(invoiceModalBill)} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "88%" }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Mess Invoice Receipt</Text>
                  <Text style={styles.invoiceReceiptId}>
                    Invoice #{invoiceModalBill?.id?.substring(0, 8)} • {invoiceModalBill?.billing_month}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setInvoiceModalBill(null)}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* Mess & Resident Info Card */}
              <View style={styles.invoiceHeaderCard}>
                <Text style={styles.invoiceMessName}>
                  {currentResidency?.mess?.name || "Mess Platform"}
                </Text>
                <Text style={styles.invoiceMessSub}>
                  Resident: {invoiceModalBill?.residency?.user?.name || user?.name}
                </Text>
                <Text style={styles.invoiceMessSub}>
                  Bed: {invoiceModalBill?.residency?.bed?.label || currentResidency?.bed?.label || "Assigned"} • Phone: {invoiceModalBill?.residency?.user?.phone || user?.phone}
                </Text>
              </View>

              {/* Itemized Table */}
              <View style={styles.invoiceItemizedTable}>
                <View style={styles.invoiceRowHeader}>
                  <Text style={styles.invoiceColHead}>Description</Text>
                  <Text style={[styles.invoiceColHead, { textAlign: "right" }]}>Amount (BDT)</Text>
                </View>

                <View style={styles.invoiceTableRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.invoiceItemTitle}>Meal Cost</Text>
                    <Text style={styles.invoiceItemSub}>
                      {invoiceModalBill?.total_meals || 0} meals eaten
                      {invoiceModalBill?.meal_rate && ` @ ৳${Number(invoiceModalBill.meal_rate).toFixed(2)}`}
                    </Text>
                  </View>
                  <Text style={styles.invoiceItemAmount}>
                    ৳{Number(invoiceModalBill?.meal_cost_total || 0).toFixed(2)}
                  </Text>
                </View>

                <View style={styles.invoiceTableRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.invoiceItemTitle}>Fixed Shared Bills</Text>
                    <Text style={styles.invoiceItemSub}>WiFi, Cook, Electricity share</Text>
                  </View>
                  <Text style={styles.invoiceItemAmount}>
                    ৳{Number(invoiceModalBill?.fixed_bill_share_total || 0).toFixed(2)}
                  </Text>
                </View>

                {Number(invoiceModalBill?.previous_due || 0) > 0 && (
                  <View style={styles.invoiceTableRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.invoiceItemTitle}>Previous Balance Carry-over</Text>
                      <Text style={styles.invoiceItemSub}>Unpaid dues from prior month</Text>
                    </View>
                    <Text style={[styles.invoiceItemAmount, { color: "#dc2626" }]}>
                      ৳{Number(invoiceModalBill.previous_due).toFixed(2)}
                    </Text>
                  </View>
                )}

                <View style={[styles.invoiceTableRow, styles.invoiceTotalHighlightRow]}>
                  <Text style={styles.invoiceTotalHighlightLabel}>Total Payable</Text>
                  <Text style={styles.invoiceTotalHighlightValue}>
                    ৳{Number(invoiceModalBill?.total_payable || 0).toFixed(2)}
                  </Text>
                </View>

                <View style={styles.invoiceTableRow}>
                  <Text style={styles.invoiceItemTitle}>Amount Paid</Text>
                  <Text style={[styles.invoiceItemAmount, { color: "#059669" }]}>
                    ৳{Number(invoiceModalBill?.paid_amount || 0).toFixed(2)}
                  </Text>
                </View>

                <View style={[styles.invoiceTableRow, { borderBottomWidth: 0 }]}>
                  <Text style={[styles.invoiceTotalHighlightLabel, { color: "#111827" }]}>
                    Remaining Net Balance
                  </Text>
                  <Text
                    style={[
                      styles.invoiceTotalHighlightValue,
                      Number(invoiceModalBill?.remaining_due || 0) > 0
                        ? { color: "#dc2626" }
                        : { color: "#059669" },
                    ]}
                  >
                    ৳{Number(invoiceModalBill?.remaining_due ?? invoiceModalBill?.total_payable ?? 0).toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Payments History */}
              {invoiceModalBill?.payments && invoiceModalBill.payments.length > 0 && (
                <View style={styles.paymentsBox}>
                  <Text style={styles.paymentsTitle}>Payment History</Text>
                  {invoiceModalBill.payments.map((p: any) => (
                    <View key={p.id} style={styles.paymentRow}>
                      <Text style={styles.paymentMeta}>
                        {new Date(p.paid_at).toLocaleDateString()} • {p.method?.toUpperCase()}
                      </Text>
                      <Text style={styles.paymentAmount}>৳{Number(p.amount).toFixed(2)}</Text>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={styles.modalSubmitButton}
                onPress={() => setInvoiceModalBill(null)}
              >
                <Text style={styles.modalSubmitText}>Close Receipt</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Record Payment Modal */}
      <Modal visible={Boolean(paymentModal)} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <TouchableOpacity onPress={() => setPaymentModal(null)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Log cash or digital payment received for Invoice #{paymentModal?.id?.substring(0, 8)}.
            </Text>

            <Text style={styles.inputLabel}>Payment Amount (BDT)</Text>
            <TextInput
              style={styles.modalInput}
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Payment Method</Text>
            <View style={styles.methodRow}>
              {["cash", "mobile_banking", "bank"].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.methodBtn, paymentMethod === m && styles.methodBtnActive]}
                  onPress={() => setPaymentMethod(m)}
                >
                  <Text
                    style={[
                      styles.methodBtnText,
                      paymentMethod === m && styles.methodBtnTextActive,
                    ]}
                  >
                    {m === "mobile_banking" ? "bKash / Nagad" : m.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Note (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Paid in cash at dining hall"
              value={paymentNote}
              onChangeText={setPaymentNote}
            />

            <TouchableOpacity
              style={styles.modalSubmitButton}
              onPress={handleRecordPayment}
              disabled={paymentSubmitting}
            >
              {paymentSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.modalSubmitText}>Confirm Payment</Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#059669",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  generateBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  billList: {
    gap: 16,
  },
  billCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  billCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  billingMonth: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  invoiceNumber: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPaid: {
    backgroundColor: "#d1fae5",
  },
  statusPartial: {
    backgroundColor: "#fef3c7",
  },
  statusIssued: {
    backgroundColor: "#dbeafe",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  statusTextPaid: {
    color: "#065f46",
  },
  statusTextPartial: {
    color: "#92400e",
  },
  statusTextIssued: {
    color: "#1e40af",
  },
  billDetails: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailLabel: {
    fontSize: 13,
    color: "#4b5563",
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  billFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  dueLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  dueValue: {
    fontSize: 18,
    fontWeight: "900",
  },
  recordPayBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#ecfdf5",
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  recordPayText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#065f46",
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 20,
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
  methodRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  methodBtnActive: {
    backgroundColor: "#d1fae5",
    borderColor: "#10b981",
  },
  methodBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4b5563",
  },
  methodBtnTextActive: {
    color: "#065f46",
    fontWeight: "800",
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
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#e5e7eb",
    borderRadius: 14,
    padding: 3,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 12,
  },
  segmentBtnActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4b5563",
  },
  segmentBtnTextActive: {
    color: "#065f46",
    fontWeight: "800",
  },
  summaryStatsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 2,
  },
  summaryStatBox: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  summaryStatLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  summaryStatValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    marginTop: 2,
  },
  residentBillName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  billActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  viewInvoiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  viewInvoiceBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  invoiceReceiptId: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  invoiceHeaderCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  invoiceMessName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#059669",
  },
  invoiceMessSub: {
    fontSize: 12,
    color: "#4b5563",
    marginTop: 2,
  },
  invoiceItemizedTable: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
    marginBottom: 14,
  },
  invoiceRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  invoiceColHead: {
    fontSize: 11,
    fontWeight: "800",
    color: "#4b5563",
    textTransform: "uppercase",
  },
  invoiceTableRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  invoiceItemTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  invoiceItemSub: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 1,
  },
  invoiceItemAmount: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  invoiceTotalHighlightRow: {
    backgroundColor: "#ecfdf5",
  },
  invoiceTotalHighlightLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#065f46",
  },
  invoiceTotalHighlightValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#065f46",
  },
  paymentsBox: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 8,
  },
  paymentsTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#374151",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  paymentMeta: {
    fontSize: 11,
    color: "#4b5563",
  },
  paymentAmount: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },
});
