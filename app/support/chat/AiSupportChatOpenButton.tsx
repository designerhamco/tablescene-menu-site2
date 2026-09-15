"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { AI_SUPPORT_CHAT_OPEN_EVENT } from "@/lib/ai-support-chat-launcher";

type AiSupportChatOpenButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export default function AiSupportChatOpenButton({ children, type = "button", ...props }: AiSupportChatOpenButtonProps) {
  return (
    <button
      {...props}
      type={type}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) {
          window.dispatchEvent(new Event(AI_SUPPORT_CHAT_OPEN_EVENT));
        }
      }}
    >
      {children}
    </button>
  );
}
