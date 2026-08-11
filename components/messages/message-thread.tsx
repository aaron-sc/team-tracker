"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { sendMessageAction } from "@/lib/actions/messages";
import type { ActionState } from "@/lib/actions/types";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/auth/submit-button";
import { cn } from "@/lib/utils";

type Msg = { id: string; body: string; createdAt: string; senderId: string; senderName: string };

export function MessageThread({
  orgSlug,
  orgId,
  conversationId,
  currentMembershipId,
  initialMessages,
}: {
  orgSlug: string;
  orgId: string;
  conversationId: string;
  currentMembershipId: string;
  initialMessages: Msg[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const bottomRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const lastTimestampRef = useRef<string | undefined>(initialMessages.at(-1)?.createdAt);

  const action = sendMessageAction.bind(null, orgSlug, orgId, conversationId);
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);

  const poll = useCallback(async () => {
    const since = lastTimestampRef.current ? `?since=${encodeURIComponent(lastTimestampRef.current)}` : "";
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages${since}`);
      if (!res.ok) return;
      const data: { messages: Msg[] } = await res.json();
      if (data.messages.length) {
        setMessages((prev) => [...prev, ...data.messages]);
        lastTimestampRef.current = data.messages[data.messages.length - 1].createdAt;
      }
    } catch {
      // transient network error — next poll will retry
    }
  }, [conversationId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") poll();
    }, 3000);
    return () => clearInterval(interval);
  }, [poll]);

  useEffect(() => {
    if (state && !state.error) {
      formRef.current?.reset();
      poll();
    }
  }, [state, poll]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 space-y-3 overflow-y-auto py-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet. Say hello.</p>
        ) : null}
        {messages.map((m) => {
          const mine = m.senderId === currentMembershipId;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[70%] rounded-lg px-3 py-2 text-sm",
                  mine ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={cn("mt-1 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {new Date(m.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form
        ref={formRef}
        action={formAction}
        className="flex items-end gap-2 border-t pt-3"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            formRef.current?.requestSubmit();
          }
        }}
      >
        <Textarea name="body" placeholder="Write a message…" rows={1} required className="min-h-9 resize-none" />
        <SubmitButton>Send</SubmitButton>
      </form>
      {state?.error ? <p className="mt-1 text-sm text-destructive">{state.error}</p> : null}
    </div>
  );
}
