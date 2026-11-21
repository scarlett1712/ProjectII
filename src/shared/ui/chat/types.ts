/** Message shared by the full chat, quick chat and the guest chat on the sign-in screen. */
export interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  /** ISO timestamp, including for temporary client messages, so the full chat can display send times. */
  createdAt?: string;
}
