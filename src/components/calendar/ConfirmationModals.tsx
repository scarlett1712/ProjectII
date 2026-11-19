"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, Trash2 } from "lucide-react";
import { ModalPortal } from "@/components/ModalPortal";

export type ConfirmDialogState = {
  show: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
} | null;

export type DeleteConfirmState = {
  show: boolean;
  id: string;
  isTask: boolean;
  isRecurring: boolean;
} | null;

export type SaveConfirmState = {
  show: boolean;
  payload: any;
} | null;

interface ConfirmationModalsProps {
  confirmDialog: ConfirmDialogState;
  setConfirmDialog: (val: ConfirmDialogState) => void;
  deleteConfirm: DeleteConfirmState;
  setDeleteConfirm: (val: DeleteConfirmState) => void;
  executeDelete: (id: string, isTask: boolean, scope: "one" | "future" | "all") => void | Promise<void>;
  saveConfirm: SaveConfirmState;
  setSaveConfirm: (val: SaveConfirmState) => void;
  executeSave: (payload: any, scope: "one" | "future" | "all") => void | Promise<void>;
}

export function ConfirmationModals({
  confirmDialog,
  setConfirmDialog,
  deleteConfirm,
  setDeleteConfirm,
  executeDelete,
  saveConfirm,
  setSaveConfirm,
  executeSave,
}: ConfirmationModalsProps) {
  return (
    <>
      {/* CUSTOM CONFIRM DIALOG */}
      <AnimatePresence>
        {confirmDialog && confirmDialog.show && (
          <ModalPortal>
            <div 
              onClick={() => setConfirmDialog(null)}
              className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overscroll-contain"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-[400px] rounded-[32px] p-6 shadow-2xl border border-gray-100 relative max-h-[85dvh] overflow-y-auto overscroll-contain scrollbar-thin"
              >
                <button 
                  onClick={() => setConfirmDialog(null)} 
                  className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
                  aria-label="Đóng hộp thoại"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-3 mb-4 mt-2">
                  <div className="p-3 bg-purple-50 text-[#A172FD] rounded-2xl">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">
                    {confirmDialog.title}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mb-6 font-semibold">
                  {confirmDialog.message}
                </p>
                <button 
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className="w-full rounded-xl bg-[#A172FD] py-3 font-bold text-white hover:bg-[#8b5cf6] transition-colors shadow-md text-sm"
                >
                  Đồng ý
                </button>
              </motion.div>
            </div>
          </ModalPortal>
        )}
      </AnimatePresence>

      {/* CUSTOM DELETE CONFIRMATION DIALOG */}
      <AnimatePresence>
        {deleteConfirm && deleteConfirm.show && (
          <ModalPortal>
            <div 
              onClick={() => setDeleteConfirm(null)}
              className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overscroll-contain"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-[420px] rounded-[32px] p-6 shadow-2xl border border-gray-100 relative max-h-[85dvh] overflow-y-auto overscroll-contain scrollbar-thin"
              >
                <button 
                  onClick={() => setDeleteConfirm(null)} 
                  className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
                  aria-label="Đóng hộp thoại xóa"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-3 mb-4 mt-2">
                  <div className="p-3 bg-red-50 text-red-500 rounded-2xl">
                    <Trash2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">
                    Xác nhận xóa {deleteConfirm.isTask ? "công việc" : "lịch trình"}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mb-6 font-semibold">
                  {deleteConfirm.isRecurring 
                    ? "Đây là một lịch trình lặp lại. Bạn muốn xóa sự kiện này thế nào?"
                    : `Bạn có chắc chắn muốn xóa ${deleteConfirm.isTask ? "công việc" : "lịch trình"} này không?`}
                </p>
                <div className="flex flex-col gap-2">
                  {deleteConfirm.isRecurring ? (
                    <>
                      <button 
                        onClick={() => {
                          executeDelete(deleteConfirm.id, deleteConfirm.isTask, "one");
                          setDeleteConfirm(null);
                        }}
                        className="w-full rounded-xl bg-amber-500 py-3 font-bold text-white hover:bg-amber-600 transition-colors shadow-md text-sm cursor-pointer"
                      >
                        Xóa duy nhất sự kiện này
                      </button>
                      <button 
                        onClick={() => {
                          executeDelete(deleteConfirm.id, deleteConfirm.isTask, "future");
                          setDeleteConfirm(null);
                        }}
                        className="w-full rounded-xl bg-orange-500 py-3 font-bold text-white hover:bg-orange-600 transition-colors shadow-md text-sm cursor-pointer"
                      >
                        Xóa từ sự kiện này về sau
                      </button>
                      <button 
                        onClick={() => {
                          executeDelete(deleteConfirm.id, deleteConfirm.isTask, "all");
                          setDeleteConfirm(null);
                        }}
                        className="w-full rounded-xl bg-red-500 py-3 font-bold text-white hover:bg-red-600 transition-colors shadow-md text-sm cursor-pointer"
                      >
                        Xóa tất cả các sự kiện
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => {
                        executeDelete(deleteConfirm.id, deleteConfirm.isTask, "all");
                        setDeleteConfirm(null);
                      }}
                      className="w-full rounded-xl bg-red-500 py-3 font-bold text-white hover:bg-red-600 transition-colors shadow-md text-sm"
                    >
                      Xác nhận xóa
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          </ModalPortal>
        )}
      </AnimatePresence>

      {/* CUSTOM SAVE CONFIRMATION DIALOG */}
      <AnimatePresence>
        {saveConfirm && saveConfirm.show && (
          <ModalPortal>
            <div 
              onClick={() => setSaveConfirm(null)}
              className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overscroll-contain"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-[420px] rounded-[32px] p-6 shadow-2xl border border-gray-100 relative max-h-[85dvh] overflow-y-auto overscroll-contain scrollbar-thin"
              >
                <button 
                  onClick={() => setSaveConfirm(null)} 
                  className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
                  aria-label="Đóng hộp thoại lưu"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-3 mb-4 mt-2">
                  <div className="p-3 bg-purple-50 text-[#A172FD] rounded-2xl">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">
                    Xác nhận lưu lịch trình lặp
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mb-6 font-semibold">
                  Đây là một lịch trình lặp lại. Bạn muốn lưu các thay đổi thế nào?
                </p>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => {
                      executeSave(saveConfirm.payload, "one");
                      setSaveConfirm(null);
                    }}
                    className="w-full rounded-xl bg-amber-500 py-3 font-bold text-white hover:bg-amber-600 transition-colors shadow-md text-sm cursor-pointer"
                  >
                    Lưu duy nhất sự kiện này
                  </button>
                  <button 
                    onClick={() => {
                      executeSave(saveConfirm.payload, "future");
                      setSaveConfirm(null);
                    }}
                    className="w-full rounded-xl bg-orange-500 py-3 font-bold text-white hover:bg-orange-600 transition-colors shadow-md text-sm cursor-pointer"
                  >
                    Lưu từ sự kiện này về sau
                  </button>
                  <button 
                    onClick={() => {
                      executeSave(saveConfirm.payload, "all");
                      setSaveConfirm(null);
                    }}
                    className="w-full rounded-xl bg-[#A172FD] py-3 font-bold text-white hover:bg-[#8b5cf6] transition-colors shadow-md text-sm cursor-pointer"
                  >
                    Lưu tất cả các sự kiện
                  </button>
                </div>
              </motion.div>
            </div>
          </ModalPortal>
        )}
      </AnimatePresence>
    </>
  );
}
