import type { ReactNode } from "react";
import { cn } from "@/shared/ui/components";
import type { ChatMessage } from "./types";

/** sm for guest chat on the sign-in screen, md for in-app quick chat and lg for the full chat screen. */
export type ChatBubbleSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<ChatBubbleSize, { column: string; label: string; bubble: string }> = {
  sm: { column: "max-w-[85%] space-y-0.5", label: "text-3xs", bubble: "rounded-xl px-3 py-1.5 text-xs" },
  md: { column: "max-w-[85%] space-y-1", label: "text-2xs", bubble: "rounded-2xl px-4 py-2 text-sm" },
  lg: { column: "max-w-[75%] space-y-1", label: "text-3xs", bubble: "rounded-3xl px-5 py-3.5 text-sm" },
};

interface ChatBubbleProps {
  role: ChatMessage["role"];
  /** Sender name above the bubble. */
  sender: string;
  size?: ChatBubbleSize;
  /** Avatar to the left of assistant messages. */
  avatar?: ReactNode;
  /** Secondary line beneath the bubble, such as the send time. */
  footer?: ReactNode;
  children: ReactNode;
}

/** Right-align user messages on a dark background and left-align assistant messages on white. */
export function ChatBubble({ role, sender, size = "md", avatar, footer, children }: ChatBubbleProps) {
  const isUser = role === "USER";
  const classes = SIZE_CLASSES[size];
  return (
    <div className={cn("flex items-start gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && avatar}
      <div className={cn("flex flex-col", isUser ? "items-end" : "items-start", classes.column)}>
        <span className={cn("px-1.5 font-black text-primary opacity-75", classes.label)}>{sender}</span>
        <div
          className={cn(
            "whitespace-pre-wrap text-left leading-relaxed shadow-sm",
            classes.bubble,
            isUser
              ? "rounded-tr-none bg-primary-strong font-black text-white"
              : "rounded-tl-none border border-purple-100 bg-white font-medium text-gray-800",
          )}
        >
          {children}
        </div>
        {footer}
      </div>
    </div>
  );
}
