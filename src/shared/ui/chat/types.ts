/** Sentinel message content rendered as a wavy loading dots indicator. */
export const CHAT_LOADING_TOKEN = "__CHAT_LOADING__";

/** Message shared by the full chat, quick chat and the guest chat on the sign-in screen. */
export interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  /** ISO timestamp, including for temporary client messages, so the full chat can display send times. */
  createdAt?: string;
}
