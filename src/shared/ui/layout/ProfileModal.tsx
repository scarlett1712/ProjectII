"use client";

import { Camera, User as UserIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { Modal, Spinner } from "@/shared/ui/components";
import { ProfileDetails, type ProfileSummary } from "./ProfileDetails";
import { ProfileEditForm, type ProfileFormValues } from "./ProfileEditForm";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  profile: ProfileSummary | null;
  avatarUrl: string | null;
  isUploadingAvatar: boolean;
  onAvatarFileSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  form: ProfileFormValues;
  onFormChange: (patch: Partial<ProfileFormValues>) => void;
  onSubmitForm: (event: React.FormEvent) => void;
  onChangePassword: () => void;
  onSignOut: () => void;
}

/** Profile modal with avatar, read-only details and an edit form. */
export function ProfileModal({
  open,
  onClose,
  userName,
  profile,
  avatarUrl,
  isUploadingAvatar,
  onAvatarFileSelected,
  isEditing,
  onStartEdit,
  onCancelEdit,
  form,
  onFormChange,
  onSubmitForm,
  onChangePassword,
  onSignOut,
}: ProfileModalProps) {
  const tShell = useTranslations("shell");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  return (
    <Modal open={open} onClose={onClose} ariaLabel={tShell("profile.dialogAria")} size="md">
      <div className="flex flex-col items-center">
        <input ref={avatarInputRef} type="file" accept="image/*" onChange={onAvatarFileSelected} className="hidden" />
        <button
          type="button"
          className="group relative mb-6 cursor-pointer"
          onClick={() => avatarInputRef.current?.click()}
          title={tShell("profile.changeAvatarTitle")}
          aria-label={tShell("profile.changeAvatarTitle")}
        >
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-primary-soft shadow-inner ring-8 ring-primary-soft/50">
            {avatarUrl ? (
              <img src={avatarUrl} alt={tShell("sidebar.avatarAlt")} className="h-full w-full object-cover" />
            ) : (
              <UserIcon className="h-12 w-12 text-primary" />
            )}
          </div>
          <div className="absolute bottom-0 right-0 rounded-full bg-primary p-2 text-white shadow-md transition-transform group-hover:scale-110 active:scale-95">
            {isUploadingAvatar ? <Spinner className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
          </div>
        </button>

        {isEditing ? (
          <ProfileEditForm values={form} onChange={onFormChange} onSubmit={onSubmitForm} onCancel={onCancelEdit} />
        ) : (
          <ProfileDetails
            userName={userName}
            profile={profile}
            onEdit={onStartEdit}
            onClose={onClose}
            onChangePassword={onChangePassword}
            onSignOut={onSignOut}
          />
        )}
      </div>
    </Modal>
  );
}
