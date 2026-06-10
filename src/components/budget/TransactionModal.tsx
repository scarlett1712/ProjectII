"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown } from "lucide-react";

export interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  accounts: any[];
  categories: any[];
}

const getContrastTextColor = (hexColor: string) => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  if (brightness > 180) {
    const factor = 0.3;
    const dr = Math.floor(r * factor);
    const dg = Math.floor(g * factor);
    const db = Math.floor(b * factor);
    return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
  } else if (brightness > 130) {
    const factor = 0.45;
    const dr = Math.floor(r * factor);
    const dg = Math.floor(g * factor);
    const db = Math.floor(b * factor);
    return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
  } else {
    return "#FFFFFF";
  }
};

const getTagStyles = (hexColor: string) => {
  const textColor = getContrastTextColor(hexColor);
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  if (brightness > 180) {
    return {
      backgroundColor: hexColor,
      color: textColor,
      border: `1px solid ${textColor}30`
    };
  } else if (brightness > 130) {
    return {
      backgroundColor: hexColor,
      color: textColor,
      border: `1px solid ${textColor}30`
    };
  } else {
    return {
      backgroundColor: hexColor,
      color: "#FFFFFF",
      border: "1px solid rgba(255, 255, 255, 0.15)"
    };
  }
};

const formatVND = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
};

const AccountSelector = ({ selectedId, onSelect, accounts, isOpen, setIsOpen }: any) => {
  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full rounded-2xl bg-[#F5F3FF] px-4 py-3 text-sm font-bold text-[#4B5563] outline-none text-left"
      >
        {selectedId ? (
          (() => {
            const selectedAcc = accounts.find((a: any) => a.id === selectedId);
            if (selectedAcc) {
              const styles = getTagStyles(selectedAcc.color || "#A172FD");
              return (
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
              );
            }
            return <span className="text-gray-400">Chọn tài khoản</span>;
          })()
        ) : (
          <span className="text-gray-400">Chọn tài khoản</span>
        )}
        <ChevronDown className="h-4 w-4 text-[#A172FD] shrink-0 ml-2" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[240]" onClick={() => setIsOpen(false)} />
      )}

      {isOpen && (
        <div className="absolute z-[250] mt-1.5 w-full bg-white border border-gray-100 rounded-2xl shadow-xl p-2 max-h-[220px] overflow-y-auto space-y-1">
          {accounts.map((a: any) => (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                onSelect(a.id);
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 rounded-xl hover:bg-purple-50/50 transition-colors flex flex-col items-start text-left min-w-0 gap-1"
            >
              <div className="flex items-center gap-1.5 min-w-0 w-full">
                {(() => {
                  const styles = getTagStyles(a.color || "#A172FD");
                  return (
                    <span
                      className="inline-block px-3 py-1 rounded-full text-xs font-bold font-sans"
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
              <span className="text-xs font-semibold text-purple-600 bg-purple-50/80 px-2 py-0.5 rounded-lg ml-1">
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
  );
};

const CategorySelector = ({ selectedId, onSelect, categories, isOpen, setIsOpen }: any) => {
  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full rounded-2xl bg-[#F5F3FF] px-4 py-3 text-sm font-bold text-[#4B5563] outline-none text-left"
      >
        {selectedId ? (
          (() => {
            const selectedCat = categories.find((c: any) => c.id === selectedId);
            return selectedCat ? (
              <span
                className="inline-block px-3 py-1 rounded-full text-xs font-bold font-sans"
                style={getTagStyles(selectedCat.color)}
              >
                {selectedCat.name}
              </span>
            ) : (
              <span className="text-gray-400">Chọn phân loại</span>
            );
          })()
        ) : (
          <span className="text-gray-400">Chọn phân loại</span>
        )}
        <ChevronDown className="h-4 w-4 text-[#A172FD] shrink-0 ml-2" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[240]" onClick={() => setIsOpen(false)} />
      )}

      {isOpen && (
        <div className="absolute z-[250] mt-1.5 w-full bg-white border border-gray-100 rounded-2xl shadow-xl p-2 max-h-[260px] overflow-y-auto space-y-1">
          {categories.map((c: any) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onSelect(c.id);
                setIsOpen(false);
              }}
              className="w-full text-left p-2 hover:bg-purple-50/50 rounded-xl transition-colors flex items-center"
            >
              <span
                className="inline-block px-3 py-1 rounded-full text-xs font-bold font-sans"
                style={getTagStyles(c.color)}
              >
                {c.name}
              </span>
            </button>
          ))}
          {categories.length === 0 && (
            <div className="p-3 text-xs text-gray-400 text-center font-bold">
              Chưa có danh mục nào.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export function TransactionModal({ isOpen, onClose, onSuccess, accounts, categories }: TransactionModalProps) {
  const [transactionTab, setTransactionTab] = useState<"EXPENSE" | "INCOME" | "TRANSFER">("EXPENSE");
  
  const [txAmountStr, setTxAmountStr] = useState("");
  const [txCategory, setTxCategory] = useState("");
  const [txFromAccount, setTxFromAccount] = useState("");
  const [txToAccount, setTxToAccount] = useState("");
  const [txNote, setTxNote] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);

  // Dropdowns
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [fromAccDropdownOpen, setFromAccDropdownOpen] = useState(false);
  const [toAccDropdownOpen, setToAccDropdownOpen] = useState(false);

  // Close dropdowns when changing tabs
  const handleTabChange = (tab: "EXPENSE" | "INCOME" | "TRANSFER") => {
    setTransactionTab(tab);
    setCatDropdownOpen(false);
    setFromAccDropdownOpen(false);
    setToAccDropdownOpen(false);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setTxAmountStr("");
      return;
    }
    setTxAmountStr(parseInt(raw, 10).toLocaleString("en-US"));
  };

  const appendZeros = (zeros: string) => {
    const raw = txAmountStr.replace(/\D/g, "");
    if (!raw) {
      if (zeros === "00") setTxAmountStr("0");
      if (zeros === "000") setTxAmountStr("0");
      return;
    }
    setTxAmountStr(parseInt(raw + zeros, 10).toLocaleString("en-US"));
  };

  const handleLogTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(txAmountStr.replace(/\D/g, ""), 10);
    
    if (!amount || isNaN(amount)) {
      alert("Số tiền không hợp lệ.");
      return;
    }

    if (transactionTab !== "TRANSFER" && !txCategory) {
      alert("Vui lòng chọn danh mục phân loại.");
      return;
    }

    if (transactionTab === "EXPENSE" && !txFromAccount) {
      alert("Vui lòng chọn tài khoản nguồn chi.");
      return;
    }
    if (transactionTab === "INCOME" && !txToAccount) {
      alert("Vui lòng chọn tài khoản nhận tiền.");
      return;
    }
    if (transactionTab === "TRANSFER" && (!txFromAccount || !txToAccount)) {
      alert("Vui lòng chọn tài khoản chuyển và nhận.");
      return;
    }

    try {
      const res = await fetch("/api/budget/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amount,
          type: transactionTab,
          categoryId: transactionTab !== "TRANSFER" ? txCategory : null,
          fromAccountId: transactionTab !== "INCOME" ? txFromAccount : null,
          toAccountId: transactionTab !== "EXPENSE" ? txToAccount : null,
          note: txNote.trim(),
          occurredAt: new Date(txDate).toISOString(),
        }),
      });

      if (res.ok) {
        setTxAmountStr("");
        setTxCategory("");
        setTxFromAccount("");
        setTxToAccount("");
        setTxNote("");
        onClose();
        if (onSuccess) onSuccess();
      } else {
        const body = await res.json();
        alert(body.error || "Lỗi khi ghi giao dịch.");
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi mạng.");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 200, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 200, opacity: 0, scale: 0.9 }}
          className="relative w-full max-w-xl overflow-visible rounded-[32px] bg-white p-0 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button X */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-1.5 rounded-xl bg-black/5 hover:bg-black/10 text-gray-700 hover:text-red-500 transition-colors z-[160]"
          >
            <X className="h-4 w-4" />
          </button>
          
          {/* Wallet Top Border/Flap */}
          <div className="h-4 bg-[#A172FD] rounded-t-[32px]" />
          <div className="flex justify-center">
            <div className="h-6 w-32 rounded-b-2xl bg-[#A172FD] shadow-md" />
          </div>

          <div className="p-10 pt-6">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#A172FD]">Thêm giao dịch</h2>
              <div className="flex gap-1 bg-[#F5F3FF] p-1 rounded-full">
                {[
                  { id: "EXPENSE", label: "Chi tiêu" },
                  { id: "INCOME", label: "Thu nhập" },
                  { id: "TRANSFER", label: "Chuyển khoản" }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleTabChange(t.id as any)}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${transactionTab === t.id ? "bg-[#A172FD] text-white shadow-sm" : "text-[#6B7280] hover:text-[#A172FD]"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-xs font-bold text-[#6B7280] uppercase tracking-wider">Số tiền</label>
                <div className="flex items-end gap-2 border-b-2 border-[#F5F3FF] pb-2">
                  <span className="text-2xl font-bold text-[#A172FD]">đ</span>
                  <input 
                    type="text" 
                    value={txAmountStr}
                    onChange={handleAmountChange}
                    placeholder="0" 
                    className="w-full bg-transparent text-4xl font-black text-[#A172FD] outline-none" 
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => appendZeros("00")} className="px-3 py-1 bg-gray-100 hover:bg-purple-100 hover:text-[#A172FD] text-gray-600 rounded-lg text-xs font-bold transition-colors shadow-sm">+00</button>
                  <button onClick={() => appendZeros("000")} className="px-3 py-1 bg-gray-100 hover:bg-purple-100 hover:text-[#A172FD] text-gray-600 rounded-lg text-xs font-bold transition-colors shadow-sm">+000</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                {/* Row 1 */}
                <div className="relative">
                  {transactionTab === "TRANSFER" ? (
                    <>
                      <label className="mb-3 block text-xs font-bold text-[#6B7280] uppercase tracking-wider">Từ tài khoản</label>
                      <AccountSelector 
                        selectedId={txFromAccount} 
                        onSelect={setTxFromAccount} 
                        accounts={accounts} 
                        isOpen={fromAccDropdownOpen} 
                        setIsOpen={(v: boolean) => {
                          setFromAccDropdownOpen(v);
                          if (v) { setCatDropdownOpen(false); setToAccDropdownOpen(false); }
                        }} 
                      />
                    </>
                  ) : (
                    <>
                      <label className="mb-3 block text-xs font-bold text-[#6B7280] uppercase tracking-wider">Phân loại</label>
                      <CategorySelector 
                        selectedId={txCategory} 
                        onSelect={setTxCategory} 
                        categories={categories.filter(c => c.type === transactionTab)} 
                        isOpen={catDropdownOpen} 
                        setIsOpen={(v: boolean) => {
                          setCatDropdownOpen(v);
                          if (v) { setFromAccDropdownOpen(false); setToAccDropdownOpen(false); }
                        }} 
                      />
                    </>
                  )}
                </div>
                <div className="relative">
                  <label className="mb-3 block text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                    {transactionTab === "TRANSFER" ? "Tới tài khoản" : "Thời gian"}
                  </label>
                  {transactionTab === "TRANSFER" ? (
                    <AccountSelector 
                      selectedId={txToAccount} 
                      onSelect={setTxToAccount} 
                      accounts={accounts} 
                      isOpen={toAccDropdownOpen} 
                      setIsOpen={(v: boolean) => {
                        setToAccDropdownOpen(v);
                        if (v) { setFromAccDropdownOpen(false); setCatDropdownOpen(false); }
                      }} 
                    />
                  ) : (
                    <input 
                      type="date" 
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full rounded-2xl bg-[#F5F3FF] px-4 py-3 text-sm font-bold text-[#4B5563] outline-none" 
                    />
                  )}
                </div>

                {/* Row 2 */}
                <div className="relative">
                  <label className="mb-3 block text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                    {transactionTab === "TRANSFER" ? "Thời gian" : "Nguồn tiền"}
                  </label>
                  {transactionTab === "TRANSFER" ? (
                    <input 
                      type="date" 
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full rounded-2xl bg-[#F5F3FF] px-4 py-3 text-sm font-bold text-[#4B5563] outline-none" 
                    />
                  ) : (
                    <AccountSelector 
                      selectedId={transactionTab === "INCOME" ? txToAccount : txFromAccount} 
                      onSelect={transactionTab === "INCOME" ? setTxToAccount : setTxFromAccount} 
                      accounts={accounts} 
                      isOpen={transactionTab === "INCOME" ? toAccDropdownOpen : fromAccDropdownOpen} 
                      setIsOpen={(v: boolean) => {
                        if (transactionTab === "INCOME") {
                          setToAccDropdownOpen(v);
                          if (v) { setFromAccDropdownOpen(false); setCatDropdownOpen(false); }
                        } else {
                          setFromAccDropdownOpen(v);
                          if (v) { setToAccDropdownOpen(false); setCatDropdownOpen(false); }
                        }
                      }} 
                    />
                  )}
                </div>
                <div>
                  <label className="mb-3 block text-xs font-bold text-[#6B7280] uppercase tracking-wider">Ghi chú</label>
                  <input 
                    type="text" 
                    value={txNote}
                    onChange={(e) => setTxNote(e.target.value)}
                    placeholder="Ghi chú gì đó..." 
                    className="w-full rounded-2xl bg-[#F5F3FF] px-4 py-3 text-sm font-bold text-[#4B5563] outline-none placeholder:text-[#9CA3AF]" 
                  />
                </div>
              </div>
            </div>

            <div className="mt-10">
              <button
                onClick={handleLogTransaction}
                className="w-full rounded-2xl bg-[#A172FD] py-4 font-bold text-white shadow-lg shadow-[#A172FD]/20 transition-transform hover:scale-[1.02] active:scale-95 text-sm"
              >
                Ghi lại ngay
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
