"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, ChevronDown } from "lucide-react";
import type { Account, Category, Transaction } from "./types";
import { ModalPortal } from "@/components/ModalPortal";

interface EditTransactionModalProps {
  showEditTransaction: boolean;
  setShowEditTransaction: (val: boolean) => void;
  editingTransaction: Transaction | null;
  setEditingTransaction: (val: Transaction | null) => void;
  transactionType: "EXPENSE" | "INCOME" | "TRANSFER";
  setTransactionType: (val: "EXPENSE" | "INCOME" | "TRANSFER") => void;
  txAmount: string;
  setTxAmount: (val: string) => void;
  txCategory: string;
  setTxCategory: (val: string) => void;
  txFromAccount: string;
  setTxFromAccount: (val: string) => void;
  txToAccount: string;
  setTxToAccount: (val: string) => void;
  txDate: string;
  setTxDate: (val: string) => void;
  txNote: string;
  setTxNote: (val: string) => void;
  handleEditTransaction: (e: React.FormEvent) => void;
  categories: Category[];
  accounts: Account[];
  getTagStyles: (color: string) => { backgroundColor: string; color: string; border: string };
  formatVND: (amount: number) => string;
  isSubmitting: boolean;
}

export function EditTransactionModal({
  showEditTransaction,
  setShowEditTransaction,
  editingTransaction,
  setEditingTransaction,
  transactionType,
  setTransactionType,
  txAmount,
  setTxAmount,
  txCategory,
  setTxCategory,
  txFromAccount,
  setTxFromAccount,
  txToAccount,
  setTxToAccount,
  txDate,
  setTxDate,
  txNote,
  setTxNote,
  handleEditTransaction,
  categories,
  accounts,
  getTagStyles,
  formatVND,
  isSubmitting,
}: EditTransactionModalProps) {
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [fromAccDropdownOpen, setFromAccDropdownOpen] = useState(false);
  const [toAccDropdownOpen, setToAccDropdownOpen] = useState(false);

  if (!showEditTransaction || !editingTransaction) return null;

  return (
    <ModalPortal>
      <div 
        className="fixed inset-0 z-[250] flex items-center justify-center bg-black/40 backdrop-blur-md p-3 sm:p-4 overscroll-contain" 
        onClick={() => { setShowEditTransaction(false); setEditingTransaction(null); }}
      >
        <motion.div
          initial={{ y: 150, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 150, opacity: 0 }}
          className="bg-white w-full max-w-[500px] rounded-[28px] sm:rounded-[32px] p-5 sm:p-8 shadow-2xl border border-gray-100 my-auto max-h-[85dvh] overflow-y-auto overscroll-contain pb-12 sm:pb-8 scrollbar-thin"
          onClick={(e) => e.stopPropagation()}
        >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black text-purple-950">Chỉnh sửa giao dịch</h3>
          <button 
            onClick={() => { setShowEditTransaction(false); setEditingTransaction(null); }} 
            className="p-1 rounded-full hover:bg-gray-100 text-gray-400"
            aria-label="Đóng sửa giao dịch"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Transaction Type tab buttons inside modal */}
        <div className="grid grid-cols-3 gap-1 bg-purple-50 p-1 rounded-xl text-xs font-black mb-6">
          <button
            type="button"
            onClick={() => setTransactionType("EXPENSE")}
            className={`py-2 rounded-lg text-center transition-all ${transactionType === "EXPENSE" ? "bg-[#A172FD] text-white shadow-sm" : "text-[#6B7280] hover:text-[#A172FD]"}`}
          >
            Chi tiêu
          </button>
          <button
            type="button"
            onClick={() => setTransactionType("INCOME")}
            className={`py-2 rounded-lg text-center transition-all ${transactionType === "INCOME" ? "bg-[#A172FD] text-white shadow-sm" : "text-[#6B7280] hover:text-[#A172FD]"}`}
          >
            Thu nhập
          </button>
          <button
            type="button"
            onClick={() => setTransactionType("TRANSFER")}
            className={`py-2 rounded-lg text-center transition-all ${transactionType === "TRANSFER" ? "bg-[#A172FD] text-white shadow-sm" : "text-[#6B7280] hover:text-[#A172FD]"}`}
          >
            Chuyển khoản
          </button>
        </div>

        <form onSubmit={handleEditTransaction} className="space-y-4">
          {/* 1. Amount */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Số tiền (đ)</label>
            <input
              type="number"
              required
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
              placeholder="Nhập số tiền..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-lg font-black text-purple-950 placeholder:text-gray-400 outline-none focus:border-[#A172FD] focus:ring-1 focus:ring-[#A172FD]"
            />
          </div>

          {/* 2. Selection fields depending on type */}
          {transactionType !== "TRANSFER" && (
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Danh mục phân loại</label>
              <div className="relative">
                {/* Trigger Button */}
                <button
                  type="button"
                  onClick={() => {
                    setCatDropdownOpen(!catDropdownOpen);
                    setFromAccDropdownOpen(false);
                    setToAccDropdownOpen(false);
                  }}
                  className="flex items-center justify-between w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD] focus:ring-1 focus:ring-[#A172FD] text-left"
                  aria-label="Chọn danh mục"
                >
                  {txCategory ? (
                    (() => {
                      const selectedCat = categories.find((c) => c.id === txCategory);
                      if (selectedCat) {
                        const styles = getTagStyles(selectedCat.color);
                        return (
                          <span
                            className="inline-block px-3 py-1 rounded-full text-xs font-bold font-sans"
                            style={{
                              backgroundColor: styles.backgroundColor,
                              color: styles.color,
                              border: styles.border,
                            }}
                          >
                            {selectedCat.name}
                          </span>
                        );
                      }
                      return <span className="text-gray-400">-- Chọn phân loại --</span>;
                    })()
                  ) : (
                    <span className="text-gray-400">-- Chọn phân loại --</span>
                  )}
                  <ChevronDown className="h-4 w-4 text-[#A172FD] shrink-0 ml-2" />
                </button>

                {/* Backdrop for click-outside */}
                {catDropdownOpen && (
                  <div
                    className="fixed inset-0 z-[240]"
                    onClick={() => setCatDropdownOpen(false)}
                  />
                )}

                {/* Dropdown Options List */}
                {catDropdownOpen && (
                  <div className="absolute z-[250] mt-1.5 w-full bg-white border border-gray-100 rounded-2xl shadow-xl p-2 max-h-[220px] overflow-y-auto overscroll-contain space-y-1 scrollbar-thin">
                    {categories
                      .filter((c) => c.type === transactionType)
                      .map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setTxCategory(c.id);
                            setCatDropdownOpen(false);
                          }}
                          className="w-full text-left p-2 hover:bg-purple-50/50 rounded-xl transition-colors flex items-center"
                        >
                          {(() => {
                            const styles = getTagStyles(c.color);
                            return (
                              <span
                                className="inline-block px-3 py-1 rounded-full text-xs font-bold font-sans"
                                style={{
                                  backgroundColor: styles.backgroundColor,
                                  color: styles.color,
                                  border: styles.border,
                                }}
                              >
                                {c.name}
                              </span>
                            );
                          })()}
                        </button>
                      ))}
                    {categories.filter((c) => c.type === transactionType).length === 0 && (
                      <div className="p-3 text-xs text-gray-400 text-center font-bold">
                        Chưa có danh mục phân loại nào.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {transactionType !== "INCOME" && (
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
                  {transactionType === "TRANSFER" ? "Từ tài khoản" : "Tài khoản nguồn chi"}
                </label>
                <div className="relative">
                  {/* Trigger Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setFromAccDropdownOpen(!fromAccDropdownOpen);
                      setCatDropdownOpen(false);
                      setToAccDropdownOpen(false);
                    }}
                    className="flex items-center justify-between w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD] focus:ring-1 focus:ring-[#A172FD] text-left"
                    aria-label="Chọn tài khoản nguồn"
                  >
                    {txFromAccount ? (
                      (() => {
                        const selectedAcc = accounts.find((a) => a.id === txFromAccount);
                        if (selectedAcc) {
                          const styles = getTagStyles(selectedAcc.color || "#A172FD");
                          return (
                            <div className="flex flex-col items-start leading-tight min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0 w-full">
                                <span
                                  className="inline-block px-3 py-1 rounded-full text-xs font-bold font-sans"
                                  style={{
                                    backgroundColor: styles.backgroundColor,
                                    color: styles.color,
                                    border: styles.border,
                                  }}
                                >
                                  {selectedAcc.name}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-500 font-semibold ml-1 mt-1">{formatVND(selectedAcc.balance)}</span>
                            </div>
                          );
                        }
                        return <span className="text-gray-400">-- Chọn tài khoản --</span>;
                      })()
                    ) : (
                      <span className="text-gray-400">-- Chọn tài khoản --</span>
                    )}
                    <ChevronDown className="h-4 w-4 text-[#A172FD] shrink-0 ml-2" />
                  </button>

                  {/* Backdrop for click-outside */}
                  {fromAccDropdownOpen && (
                    <div
                      className="fixed inset-0 z-[240]"
                      onClick={() => setFromAccDropdownOpen(false)}
                    />
                  )}

                  {/* Dropdown Options List */}
                  {fromAccDropdownOpen && (
                    <div className="absolute z-[250] bottom-full mb-1.5 w-full bg-white border border-gray-100 rounded-2xl shadow-xl p-2 max-h-[220px] overflow-y-auto overscroll-contain space-y-1.5 scrollbar-thin">
                      {accounts.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            setTxFromAccount(a.id);
                            setFromAccDropdownOpen(false);
                          }}
                          className="w-full px-3 py-2 rounded-xl hover:bg-purple-50/50 transition-colors flex flex-col items-start text-left min-w-0 gap-1"
                        >
                          <div className="flex items-center gap-1.5 min-w-0 w-full">
                            {(() => {
                              const styles = getTagStyles(a.color || "#A172FD");
                              return (
                                <span
                                  className="inline-block px-3 py-1 rounded-full text-xs font-bold font-sans truncate max-w-full"
                                  style={{
                                    backgroundColor: styles.backgroundColor,
                                    color: styles.color,
                                    border: styles.border,
                                  }}
                                >
                                  {a.name}
                                </span>
                              );
                            })()}
                          </div>
                          <span className="text-xs font-semibold text-purple-600 bg-purple-50/80 px-2 py-0.5 rounded-lg mt-1.5">
                            {formatVND(a.balance)}
                          </span>
                        </button>
                      ))}
                      {accounts.length === 0 && (
                        <div className="p-3 text-xs text-gray-400 text-center font-bold">
                          Chưa có tài khoản nào.
                        </div>
                      )}
                      <div className="h-2" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {transactionType !== "EXPENSE" && (
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
                  {transactionType === "TRANSFER" ? "Đến tài khoản" : "Tài khoản nhận tiền"}
                </label>
                <div className="relative">
                  {/* Trigger Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setToAccDropdownOpen(!toAccDropdownOpen);
                      setCatDropdownOpen(false);
                      setFromAccDropdownOpen(false);
                    }}
                    className="flex items-center justify-between w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD] focus:ring-1 focus:ring-[#A172FD] text-left"
                    aria-label="Chọn tài khoản đích"
                  >
                    {txToAccount ? (
                      (() => {
                        const selectedAcc = accounts.find((a) => a.id === txToAccount);
                        if (selectedAcc) {
                          const styles = getTagStyles(selectedAcc.color || "#A172FD");
                          return (
                            <div className="flex flex-col items-start leading-tight min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0 w-full">
                                <span
                                  className="inline-block px-3 py-1 rounded-full text-xs font-bold font-sans truncate max-w-full"
                                  style={{
                                    backgroundColor: styles.backgroundColor,
                                    color: styles.color,
                                    border: styles.border,
                                  }}
                                >
                                  {selectedAcc.name}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-500 font-semibold ml-1 mt-1">{formatVND(selectedAcc.balance)}</span>
                            </div>
                          );
                        }
                        return <span className="text-gray-400">-- Chọn tài khoản --</span>;
                      })()
                    ) : (
                      <span className="text-gray-400">-- Chọn tài khoản --</span>
                    )}
                    <ChevronDown className="h-4 w-4 text-[#A172FD] shrink-0 ml-2" />
                  </button>

                  {/* Backdrop for click-outside */}
                  {toAccDropdownOpen && (
                    <div
                      className="fixed inset-0 z-[240]"
                      onClick={() => setToAccDropdownOpen(false)}
                    />
                  )}

                  {/* Dropdown Options List */}
                  {toAccDropdownOpen && (
                    <div className="absolute z-[250] bottom-full mb-1.5 w-full bg-white border border-gray-100 rounded-2xl shadow-xl p-2 max-h-[220px] overflow-y-auto overscroll-contain space-y-1.5 scrollbar-thin">
                      {accounts.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            setTxToAccount(a.id);
                            setToAccDropdownOpen(false);
                          }}
                          className="w-full px-3 py-2 rounded-xl hover:bg-purple-50/50 transition-colors flex flex-col items-start text-left min-w-0 gap-1"
                        >
                          <div className="flex items-center gap-1.5 min-w-0 w-full">
                            {(() => {
                              const styles = getTagStyles(a.color || "#A172FD");
                              return (
                                <span
                                  className="inline-block px-3 py-1 rounded-full text-xs font-bold font-sans truncate max-w-full"
                                  style={{
                                    backgroundColor: styles.backgroundColor,
                                    color: styles.color,
                                    border: styles.border,
                                  }}
                                >
                                  {a.name}
                                </span>
                              );
                            })()}
                          </div>
                          <span className="text-xs font-semibold text-purple-600 bg-purple-50/80 px-2 py-0.5 rounded-lg ml-1 font-semibold">
                            {formatVND(a.balance)}
                          </span>
                        </button>
                      ))}
                      {accounts.length === 0 && (
                        <div className="p-3 text-xs text-gray-400 text-center font-bold">
                          Chưa có tài khoản nào.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 3. Date */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Thời gian</label>
              <input
                type="date"
                required
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD]"
              />
            </div>

            {/* 4. Note */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Ghi chú chi tiết</label>
              <input
                type="text"
                value={txNote}
                onChange={(e) => setTxNote(e.target.value)}
                placeholder="Ăn tối, đi xem phim..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#A172FD] focus:ring-1 focus:ring-[#A172FD]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full mt-4 rounded-xl bg-[#A172FD] py-4 font-bold text-white transition-all active:scale-[0.99] shadow-lg text-sm ${
              isSubmitting ? "opacity-60 cursor-not-allowed" : "hover:bg-[#8b5cf6]"
            }`}
          >
            {isSubmitting ? "Đang lưu thay đổi..." : "Lưu thay đổi ➔"}
          </button>
        </form>
      </motion.div>
    </div>
    </ModalPortal>
  );
}
