"use client";

import React, { useEffect, useState, use } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { formatBDT } from "@/lib/utils";
import {
  Printer,
  ArrowLeft,
  Building,
  User,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
} from "lucide-react";

export default function BillInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const billId = resolvedParams.id;
  const router = useRouter();

  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (billId) {
      loadInvoice();
    }
  }, [billId]);

  const loadInvoice = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getBillInvoice(billId);
      setInvoiceData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load invoice details.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500 font-medium">Generating official invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoiceData?.bill) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-2xl border border-red-200 p-8 text-center space-y-4 shadow-sm">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900">Invoice Not Found</h2>
        <p className="text-sm text-gray-600">{error || "Unable to retrieve invoice data."}</p>
        <button
          onClick={() => router.push("/bills")}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" /> Return to Bills
        </button>
      </div>
    );
  }

  const { bill, fixed_bills, total_meals_eaten } = invoiceData;
  const residency = bill.residency || {};
  const mess = residency.mess || {};
  const user = residency.user || {};
  const bed = residency.bed || {};
  const payments = bill.payments || [];

  const invoiceNo = `INV-${bill.id.substring(0, 8).toUpperCase()}`;
  const billingMonthName = new Date(bill.billing_month + "-01").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4 px-2 sm:px-6">
      {/* Action Bar (Hidden on print) */}
      <div className="flex items-center justify-between print:hidden bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
        <button
          onClick={() => router.push("/bills")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Invoices
        </button>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition"
        >
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
      </div>

      {/* Invoice Document (Print Ready) */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-lg p-8 sm:p-12 space-y-8 print:shadow-none print:border-none print:p-0 print:rounded-none">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-gray-200">
          <div>
            <div className="inline-flex items-center gap-1.5 text-emerald-700 font-black text-xl sm:text-2xl tracking-tight">
              <Building className="h-6 w-6" />
              <span>{mess.name || "Mess Management Community"}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1 space-y-0.5">
              <p>{mess.address || "Dhaka, Bangladesh"}</p>
              <p>{mess.city || "Dhaka"}</p>
            </div>
          </div>

          <div className="sm:text-right space-y-1">
            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-full uppercase tracking-wider">
              Official Monthly Invoice
            </span>
            <div className="text-sm font-mono font-bold text-gray-800">{invoiceNo}</div>
            <div className="text-xs text-gray-500">
              Billing Period: <strong className="text-gray-900">{billingMonthName}</strong>
            </div>
            <div className="text-xs text-gray-400">
              Date: {new Date(bill.generated_at || Date.now()).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
            </div>
          </div>
        </div>

        {/* Resident & Room Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50/70 rounded-2xl p-5 border border-gray-100">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <User className="h-3 w-3" /> Resident Details (বিল প্রাপক)
            </span>
            <div className="font-extrabold text-gray-900 text-base">{user.name}</div>
            <div className="text-xs text-gray-600">{user.phone}</div>
            <div className="text-xs text-gray-500">{user.email}</div>
          </div>

          <div className="space-y-1 sm:text-right">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center sm:justify-end gap-1">
              <Building className="h-3 w-3" /> Accommodation (সিট ও স্থিতি)
            </span>
            <div className="font-bold text-gray-900 text-sm">
              Bed: <span className="text-emerald-700">{bed.label || "Assigned Bed"}</span>
            </div>
            <div className="pt-1">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  bill.status === "paid"
                    ? "bg-emerald-100 text-emerald-800"
                    : bill.status === "partially_paid"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {bill.status === "paid" && <CheckCircle2 className="h-3 w-3" />}
                {bill.status === "partially_paid" && <Clock className="h-3 w-3" />}
                {bill.status.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>

        {/* Itemized Charges Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Statement of Account (হিসাব বিবরণী)
          </h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 text-left">Description</th>
                  <th className="py-3 px-4 text-center">Details / Quantity</th>
                  <th className="py-3 px-4 text-right">Amount (BDT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {/* 1. Meal Charges */}
                <tr>
                  <td className="py-3 px-4">
                    <div className="font-bold text-gray-900">Monthly Meal Consumption (মিল খরচ)</div>
                    <div className="text-xs text-gray-400">
                      Calculated on daily per-meal dynamic grocery market rate
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center font-medium">
                    {total_meals_eaten ?? "—"} meals eaten
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900">
                    {formatBDT(bill.meal_cost_total)}
                  </td>
                </tr>

                {/* 2. Fixed Bills Share */}
                <tr>
                  <td className="py-3 px-4">
                    <div className="font-bold text-gray-900">
                      Shared Fixed Bills & Utilities (ভাড়া ও ইউটিলিটি খরচ)
                    </div>
                    {fixed_bills && fixed_bills.length > 0 ? (
                      <div className="text-xs text-gray-400 space-x-2 mt-0.5">
                        {fixed_bills.map((fb: any) => (
                          <span key={fb.id}>• {fb.title}</span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">Room rent, WiFi, electricity, maid</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center text-xs text-gray-500">
                    Shared equal / prorated
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900">
                    {formatBDT(bill.fixed_bill_share_total)}
                  </td>
                </tr>

                {/* 3. Previous Dues */}
                {parseFloat(bill.previous_due) > 0 && (
                  <tr>
                    <td className="py-3 px-4">
                      <div className="font-bold text-amber-900">
                        Previous Balance Arrears (পূর্বের বকেয়া)
                      </div>
                      <div className="text-xs text-gray-400">Unpaid dues carried over from prior months</div>
                    </td>
                    <td className="py-3 px-4 text-center text-xs text-amber-700 font-semibold">
                      Carried Forward
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-900">
                      {formatBDT(bill.previous_due)}
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Total Payable Summary */}
              <tfoot className="bg-gray-50 font-bold divide-y divide-gray-200">
                <tr>
                  <td colSpan={2} className="py-3 px-4 text-gray-900 text-sm">
                    Total Amount Payable (মোট প্রদেয় বিল)
                  </td>
                  <td className="py-3 px-4 text-right font-black text-gray-900 text-base">
                    {formatBDT(bill.total_payable)}
                  </td>
                </tr>
                <tr className="text-emerald-700">
                  <td colSpan={2} className="py-2.5 px-4 text-xs">
                    Total Amount Paid Received (মোট পরিশোধিত)
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-sm">
                    {formatBDT(bill.total_paid || 0)}
                  </td>
                </tr>
                <tr className="text-red-700 bg-red-50/50">
                  <td colSpan={2} className="py-3 px-4 text-sm font-black">
                    Net Outstanding Dues (অবশিষ্ট বকেয়া)
                  </td>
                  <td className="py-3 px-4 text-right font-black text-lg">
                    {formatBDT(bill.remaining_due ?? bill.total_payable)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Payment History Record */}
        {payments.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Payment Transactions Log (পরিশোধের বিবরণ)
            </h3>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="min-w-full divide-y divide-gray-100 text-xs">
                <thead className="bg-gray-50 font-semibold text-gray-500">
                  <tr>
                    <th className="py-2 px-3 text-left">Payment Date</th>
                    <th className="py-2 px-3 text-left">Method</th>
                    <th className="py-2 px-3 text-left">Note / Transaction</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payments.map((p: any) => (
                    <tr key={p.id}>
                      <td className="py-2 px-3 text-gray-700">{p.paid_at}</td>
                      <td className="py-2 px-3 uppercase font-semibold text-gray-800">
                        {p.method.replace("_", " ")}
                      </td>
                      <td className="py-2 px-3 text-gray-500">{p.note || "Standard Payment"}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-700">
                        {formatBDT(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Signatures & Verification Footer */}
        <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs text-gray-600">
          <div>
            <div className="border-t border-gray-400 w-40 mx-auto mb-1.5" />
            <span className="font-bold text-gray-800">Resident Signature</span>
            <div className="text-[10px] text-gray-400">স্বাক্ষর: {user.name}</div>
          </div>

          <div>
            <div className="border-t border-gray-400 w-40 mx-auto mb-1.5" />
            <span className="font-bold text-gray-800">Mess Manager / Authority</span>
            <div className="text-[10px] text-gray-400">ব্যবস্থাপক / অনুমোদিত সীলমোহর</div>
          </div>
        </div>

        <div className="text-center pt-6 border-t border-gray-100 text-[11px] text-gray-400">
          This is an official computer-generated invoice for {mess.name || "Mess Management Platform"}. No physical watermark required.
        </div>
      </div>
    </div>
  );
}
