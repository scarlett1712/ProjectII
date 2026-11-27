import { Fragment, type ReactNode } from "react";
import { cn } from "@/shared/ui/components";
import { CHAT_LOADING_TOKEN, type ChatMessage } from "./types";

/** sm for guest chat on the sign-in screen, md for in-app quick chat and lg for the full chat screen. */
export type ChatBubbleSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<ChatBubbleSize, { column: string; label: string; bubble: string }> = {
  sm: { column: "max-w-[85%] space-y-0.5", label: "text-3xs", bubble: "rounded-xl px-3 py-1.5 text-xs" },
  md: { column: "max-w-[85%] space-y-1", label: "text-2xs", bubble: "rounded-2xl px-4 py-2 text-sm" },
  lg: { column: "max-w-[75%] space-y-1", label: "text-3xs", bubble: "rounded-3xl px-5 py-3.5 text-sm" },
};

const INLINE_TOKEN_RE = /(\*\*\*[^*]+?\*\*\*|\*\*[^*]+?\*\*|\*[^*\n]+?\*|`[^`\n]+?`)/g;

/** Render lightweight inline markdown (***bold italic***, **bold**, *italic*, `code`) safely as React nodes. */
function renderInlineMarkdown(text: string): ReactNode[] {
  const lines = text.split("\n");
  return lines.map((line, lineIdx) => {
    const normalizedLine = line.replace(/^(\s*)[*-]\s+/, "$1• ");
    const parts = normalizedLine.split(INLINE_TOKEN_RE);
    const rendered = parts.map((part, idx) => {
      if (part.startsWith("***") && part.endsWith("***") && part.length > 6) {
        return (
          <strong key={idx} className="font-extrabold">
            <em>{part.slice(3, -3)}</em>
          </strong>
        );
      }
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return (
          <strong key={idx} className="font-extrabold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        return <em key={idx}>{part.slice(1, -1)}</em>;
      }
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        return (
          <code key={idx} className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.9em]">
            {part.slice(1, -1)}
          </code>
        );
      }
      return <Fragment key={idx}>{part}</Fragment>;
    });
    return (
      <Fragment key={lineIdx}>
        {rendered}
        {lineIdx < lines.length - 1 && "\n"}
      </Fragment>
    );
  });
}

function WavyLoadingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1" aria-label="...">
      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
    </span>
  );
}

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
  const content =
    children === CHAT_LOADING_TOKEN ? (
      <WavyLoadingDots />
    ) : typeof children === "string" && !isUser ? (
      renderInlineMarkdown(children)
    ) : (
      children
    );

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
          {content}
        </div>
        {footer}
      </div>
    </div>
  );
}
