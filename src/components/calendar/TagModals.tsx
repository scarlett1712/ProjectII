"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { boldColors, pastelColors } from "./calendarUtils";
import { ModalPortal } from "@/components/ModalPortal";

export type EditingTagType = {
  id: string;
  name: string;
  color: string;
  isSystem?: boolean;
} | null;

interface TagModalsProps {
  showTagModal: boolean;
  setShowTagModal: (val: boolean) => void;
  newTagName: string;
  setNewTagName: (val: string) => void;
  newTagColor: string;
  setNewTagColor: (val: string) => void;
  handleCreateTag: (e: React.FormEvent) => void;

  showEditTagModal: boolean;
  setShowEditTagModal: (val: boolean) => void;
  editingTag: EditingTagType;
  setEditingTag: (val: EditingTagType) => void;
  handleUpdateTag: (id: string, name: string, color: string) => void;
}

export function TagModals({
  showTagModal,
  setShowTagModal,
  newTagName,
  setNewTagName,
  newTagColor,
  setNewTagColor,
  handleCreateTag,

  showEditTagModal,
  setShowEditTagModal,
  editingTag,
  setEditingTag,
  handleUpdateTag,
}: TagModalsProps) {
  return (
    <>
      {/* MODAL: ADD CUSTOM TAG */}
      <AnimatePresence>
        {showTagModal && (
          <ModalPortal>
            <div 
              onClick={() => setShowTagModal(false)}
              className="fixed inset-0 z-[230] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 popup-dialog overscroll-contain"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-[360px] rounded-[28px] p-6 shadow-2xl border border-gray-100 max-h-[85dvh] overflow-y-auto overscroll-contain scrollbar-thin"
              >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#A172FD]">Thêm nhãn mới</h3>
                <button 
                  onClick={() => setShowTagModal(false)} 
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Đóng thêm nhãn"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTag} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tên nhãn</label>
                  <input 
                    required 
                    type="text" 
                    value={newTagName} 
                    onChange={e => setNewTagName(e.target.value)} 
                    placeholder="Ví dụ: Việc học, Việc nhà..." 
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD]" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Màu sắc nhãn</label>
                  <div className="space-y-3">
                    <div>
                      <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Màu đậm</span>
                      <div className="flex flex-wrap gap-1.5">
                        {boldColors.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNewTagColor(c)}
                            style={{ backgroundColor: c }}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${
                              newTagColor === c ? "border-[#A172FD] scale-110 shadow-sm" : "border-transparent hover:scale-105"
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
                            onClick={() => setNewTagColor(c)}
                            style={{ backgroundColor: c }}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${
                              newTagColor === c ? "border-[#A172FD] scale-110 shadow-sm" : "border-transparent hover:scale-105"
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
                            value={newTagColor || "#A172FD"}
                            onChange={(e) => setNewTagColor(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            aria-label="Bảng chọn màu tùy ý"
                          />
                          <span className="text-[10px] font-black text-white pointer-events-none drop-shadow-sm">+</span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-gray-500 uppercase">{newTagColor || "#A172FD"}</span>
                        <div 
                          className="w-5 h-5 rounded-full border border-gray-100 shadow-inner"
                          style={{ backgroundColor: newTagColor || "#A172FD" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    type="submit" 
                    className="w-full rounded-xl bg-[#A172FD] py-2 text-sm font-bold text-white hover:bg-[#8b5cf6] transition-colors shadow-md"
                  >
                    Lưu nhãn
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </ModalPortal>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT TAG */}
      <AnimatePresence>
        {showEditTagModal && editingTag && (
          <ModalPortal>
            <div 
              onClick={() => { setShowEditTagModal(false); setEditingTag(null); }}
              className="fixed inset-0 z-[230] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 popup-dialog overscroll-contain"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-[360px] rounded-[28px] p-6 shadow-2xl border border-gray-100 max-h-[85dvh] overflow-y-auto overscroll-contain scrollbar-thin"
              >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#A172FD]">Sửa nhãn</h3>
                <button 
                  onClick={() => { setShowEditTagModal(false); setEditingTag(null); }} 
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Đóng sửa nhãn"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editingTag) {
                    handleUpdateTag(editingTag.id, editingTag.name, editingTag.color);
                  }
                }} 
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tên nhãn</label>
                  <input 
                    required 
                    type="text" 
                    value={editingTag.name} 
                    onChange={e => setEditingTag({ ...editingTag, name: e.target.value })} 
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD]" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Màu sắc nhãn</label>
                  <div className="space-y-3">
                    <div>
                      <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Màu đậm</span>
                      <div className="flex flex-wrap gap-1.5">
                        {boldColors.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditingTag({ ...editingTag, color: c })}
                            style={{ backgroundColor: c }}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${
                              editingTag.color === c ? "border-[#A172FD] scale-110 shadow-sm" : "border-transparent hover:scale-105"
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
                            onClick={() => setEditingTag({ ...editingTag, color: c })}
                            style={{ backgroundColor: c }}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${
                              editingTag.color === c ? "border-[#A172FD] scale-110 shadow-sm" : "border-transparent hover:scale-105"
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
                            value={editingTag.color || "#A172FD"}
                            onChange={(e) => setEditingTag({ ...editingTag, color: e.target.value })}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            aria-label="Bảng chọn màu tùy ý"
                          />
                          <span className="text-[10px] font-black text-white pointer-events-none drop-shadow-sm">+</span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-gray-500 uppercase">{editingTag.color || "#A172FD"}</span>
                        <div 
                          className="w-5 h-5 rounded-full border border-gray-100 shadow-inner"
                          style={{ backgroundColor: editingTag.color || "#A172FD" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    type="submit" 
                    className="w-full rounded-xl bg-[#A172FD] py-2 text-sm font-bold text-white hover:bg-[#8b5cf6] transition-colors shadow-md"
                  >
                    Cập nhật
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </ModalPortal>
        )}
      </AnimatePresence>
    </>
  );
}
