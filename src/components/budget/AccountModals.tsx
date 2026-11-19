"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { Account } from "./types";
import { ModalPortal } from "@/components/ModalPortal";

interface AccountModalsProps {
  showAddAccount: boolean;
  setShowAddAccount: (val: boolean) => void;
  handleAddAccount: (e: React.FormEvent) => void;

  showEditAccount: boolean;
  setShowEditAccount: (val: boolean) => void;
  editingAccount: Account | null;
  setEditingAccount: (val: Account | null) => void;
  handleEditAccount: (e: React.FormEvent) => void;
  handleDeleteAccount: (id: string) => void;

  accountName: string;
  setAccountName: (val: string) => void;
  accountBalance: string;
  setAccountBalance: (val: string) => void;
  accountColor: string;
  setAccountColor: (val: string) => void;

  isSubmitting: boolean;
  boldColors: string[];
  pastelColors: string[];
}

export function AccountModals({
  showAddAccount,
  setShowAddAccount,
  handleAddAccount,

  showEditAccount,
  setShowEditAccount,
  editingAccount,
  setEditingAccount,
  handleEditAccount,
  handleDeleteAccount,

  accountName,
  setAccountName,
  accountBalance,
  setAccountBalance,
  accountColor,
  setAccountColor,

  isSubmitting,
  boldColors,
  pastelColors,
}: AccountModalsProps) {
  return (
    <>
      {/* 1. Modal Add Account */}
      {showAddAccount && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[250] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 overscroll-contain" 
            onClick={() => setShowAddAccount(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-[400px] rounded-[32px] p-6 sm:p-8 shadow-2xl border border-gray-100 max-h-[85dvh] overflow-y-auto overscroll-contain scrollbar-thin"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-purple-950">Thêm nguồn tiền mới</h3>
              <button 
                onClick={() => setShowAddAccount(false)} 
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400"
                aria-label="Đóng thêm tài khoản"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddAccount} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Tên tài khoản</label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Ví dụ: Ví điện tử Momo, Tiền mặt..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#A172FD] focus:ring-1 focus:ring-[#A172FD]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Số dư hiện tại (đ)</label>
                <input
                  type="number"
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(e.target.value)}
                  placeholder="0đ"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#A172FD] focus:ring-1 focus:ring-[#A172FD]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2.5">Màu sắc nguồn tiền</label>
                <div className="space-y-3">
                  <div>
                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Màu đậm</span>
                    <div className="flex flex-wrap gap-1.5">
                      {boldColors.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setAccountColor(c)}
                          style={{ backgroundColor: c }}
                          className={`w-6 h-6 rounded-full border-2 transition-all ${
                            accountColor === c ? "border-[#A172FD] scale-110 shadow-sm" : "border-transparent hover:scale-105"
                          }`}
                          aria-label={`Chọn màu ${c}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Màu pastel</span>
                    <div className="flex flex-wrap gap-1.5">
                      {pastelColors.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setAccountColor(c)}
                          style={{ backgroundColor: c }}
                          className={`w-6 h-6 rounded-full border-2 transition-all ${
                            accountColor === c ? "border-[#A172FD] scale-110 shadow-sm" : "border-transparent hover:scale-105"
                          }`}
                          aria-label={`Chọn màu pastel ${c}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tự chọn màu</span>
                    <div className="flex items-center gap-2">
                      <div 
                        className="relative w-6 h-6 rounded-full border border-gray-200 overflow-hidden cursor-pointer bg-gradient-to-tr from-red-400 via-green-400 to-blue-400 flex items-center justify-center group hover:scale-105 transition-transform"
                        title="Chọn màu tùy ý"
                      >
                        <input
                          type="color"
                          value={accountColor}
                          onChange={(e) => setAccountColor(e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          aria-label="Bảng chọn màu tùy ý"
                        />
                        <span className="text-[10px] font-black text-white pointer-events-none drop-shadow-sm">+</span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-gray-500 uppercase">{accountColor}</span>
                      <div 
                        className="w-5 h-5 rounded-full border border-gray-100 shadow-inner"
                        style={{ backgroundColor: accountColor }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full mt-2 rounded-xl bg-[#A172FD] py-3.5 font-bold text-white transition-all shadow-md text-sm ${
                  isSubmitting ? "opacity-60 cursor-not-allowed" : "hover:bg-[#8b5cf6]"
                }`}
              >
                {isSubmitting ? "Đang lưu..." : "Lưu tài khoản"}
              </button>
            </form>
          </motion.div>
        </div>
        </ModalPortal>
      )}

      {/* 1.5. Modal Edit Account */}
      {showEditAccount && editingAccount && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[250] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 overscroll-contain" 
            onClick={() => { setShowEditAccount(false); setEditingAccount(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-[400px] rounded-[32px] p-6 sm:p-8 shadow-2xl border border-gray-100 max-h-[85dvh] overflow-y-auto overscroll-contain scrollbar-thin"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-purple-950">Chỉnh sửa tài khoản</h3>
              <button 
                onClick={() => { setShowEditAccount(false); setEditingAccount(null); }} 
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400"
                aria-label="Đóng sửa tài khoản"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditAccount} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Tên tài khoản</label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Tên tài khoản..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#A172FD] focus:ring-1 focus:ring-[#A172FD]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Số dư hiện tại (đ)</label>
                <input
                  type="number"
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(e.target.value)}
                  placeholder="0đ"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#A172FD] focus:ring-1 focus:ring-[#A172FD]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2.5">Màu sắc nguồn tiền</label>
                <div className="space-y-3">
                  <div>
                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Màu đậm</span>
                    <div className="flex flex-wrap gap-1.5">
                      {boldColors.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setAccountColor(c)}
                          style={{ backgroundColor: c }}
                          className={`w-6 h-6 rounded-full border-2 transition-all ${
                            accountColor === c ? "border-[#A172FD] scale-110 shadow-sm" : "border-transparent hover:scale-105"
                          }`}
                          aria-label={`Chọn màu ${c}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Màu pastel</span>
                    <div className="flex flex-wrap gap-1.5">
                      {pastelColors.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setAccountColor(c)}
                          style={{ backgroundColor: c }}
                          className={`w-6 h-6 rounded-full border-2 transition-all ${
                            accountColor === c ? "border-[#A172FD] scale-110 shadow-sm" : "border-transparent hover:scale-105"
                          }`}
                          aria-label={`Chọn màu pastel ${c}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tự chọn màu</span>
                    <div className="flex items-center gap-2">
                      <div 
                        className="relative w-6 h-6 rounded-full border border-gray-200 overflow-hidden cursor-pointer bg-gradient-to-tr from-red-400 via-green-400 to-blue-400 flex items-center justify-center group hover:scale-105 transition-transform"
                        title="Chọn màu tùy ý"
                      >
                        <input
                          type="color"
                          value={accountColor}
                          onChange={(e) => setAccountColor(e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          aria-label="Bảng chọn màu tùy ý"
                        />
                        <span className="text-[10px] font-black text-white pointer-events-none drop-shadow-sm">+</span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-gray-500 uppercase">{accountColor}</span>
                      <div 
                        className="w-5 h-5 rounded-full border border-gray-100 shadow-inner"
                        style={{ backgroundColor: accountColor }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleDeleteAccount(editingAccount.id)}
                  className="px-4 py-3 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors font-bold text-sm"
                >
                  Xóa
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 rounded-xl bg-[#A172FD] py-3.5 font-bold text-white transition-all shadow-md text-sm ${
                    isSubmitting ? "opacity-60 cursor-not-allowed" : "hover:bg-[#8b5cf6]"
                  }`}
                >
                  {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
        </ModalPortal>
      )}
    </>
  );
}
