import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/shared/ui/components";
import { API_ROUTES } from "@/shared/config/routes";
import { ApiError, apiErrorMessage, apiRequest } from "@/shared/client/api";
import { resizeImageToDataUrl } from "@/shared/client/image";

/** Resize avatars to a maximum of 256px and encode as JPEG at quality 0.85. */
const AVATAR_MAX_PX = 256;
const AVATAR_JPEG_QUALITY = 0.85;
export function useAvatarUpload(profileImage?: string | null) {
  const tShell = useTranslations("shell");
  const toast = useToast();
  const { data: session, update: updateSession } = useSession();
  // Avatar states & file handler
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (profileImage) {
      setUserAvatar(profileImage);
    } else if (session?.user?.image) {
      setUserAvatar(session.user.image);
    }
  }, [profileImage, session?.user?.image]);

  const handleAvatarFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(tShell("avatar.invalidFile"));
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const base64Data = await resizeImageToDataUrl(file, AVATAR_MAX_PX, AVATAR_JPEG_QUALITY);
      setUserAvatar(base64Data);
      await apiRequest(API_ROUTES.profile, { method: "POST", body: { image: base64Data } });
      toast.success(tShell("avatar.updated"));
      await updateSession?.();
    } catch (err) {
      // Show specific server errors and a generic message for image read or decode failures.
      toast.error(err instanceof ApiError ? apiErrorMessage(err, tShell("avatar.saveFailed")) : tShell("avatar.uploadError"));
    } finally {
      setIsUploadingAvatar(false);
    }
  };
  return { userAvatar, isUploadingAvatar, handleAvatarFileSelected };
}
