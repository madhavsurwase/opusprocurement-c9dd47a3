import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Loader2, ArrowRight, User, Bot } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "AI Assistant — OpusProcureAI" },
      {
        name: "description",
        content:
          "Chat with the OpusProcureAI assistant to describe procurement needs in natural language and instantly run a vendor search.",
      },
      { property: "og:title", content: "AI Assistant — OpusProcureAI" },
      {
        property: "og:description",
        content: "Natural-language procurement assistant powered by AI.",
      },
    ],
  }),
  component: AssistantPage,
});

const EXAMPLES = [
  "I need 50 office chairs under ₹6000.",
  "Find HP printer manufacturers in Pune with 4.5+ rating.",
  "Show electrical cable wholesalers within 10 km.",
  "I need Dell laptop authorized dealers.",
];

const CHAT_KEY = "opusprocure.chat.v1";

type ExtractedSearch = {
  product?: string;
  supplierType?: string;
  category?: string;
  minRating?: number;
  distance?: string;
};

function extractSearch(text: string): ExtractedSearch | null {
  const m = text.match(/<search>([\s\S]*?)<\/search>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

function stripSearchTag(text: string) {
  return text.replace(/<search>[\s\S]*?<\/search>/g, "").trim();
}

function AssistantPage() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  // Restore chat history
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CHAT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setMessages(parsed);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist
  useEffect(() => {
    if (messages.length > 0) {
      try {
        window.localStorage.setItem(CHAT_KEY, JSON.stringify(messages));
      } catch {}
    }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const isLoading = status === "submitted" || status === "streaming";

  const submit = (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || isLoading) return;
    setInput("");
    void sendMessage({ text: value });
  };

  const applySearch = (s: ExtractedSearch) => {
    if (!s.product) return;
    const params = new URLSearchParams();
    params.set("q", s.product);
    if (s.supplierType) params.set("type", s.supplierType);
    if (s.category) params.set("category", s.category);
    if (typeof s.minRating === "number") params.set("rating", String(s.minRating));
    if (s.distance) params.set("distance", s.distance);
    navigate({ to: "/search", search: Object.fromEntries(params) as never });
  };

  const clearChat = () => {
    setMessages([]);
    try {
      window.localStorage.removeItem(CHAT_KEY);
    } catch {}
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-7rem)]">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Procurement Copilot
            </p>
            <h1 className="text-3xl font-semibold tracking-tight mt-1">AI Assistant</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Describe your procurement need — I'll extract filters and run the search.
            </p>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearChat}>
              Clear chat
            </Button>
          )}
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto card-elevated p-6 space-y-4"
        >
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto rounded-xl gradient-primary flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h2 className="font-semibold tracking-tight">How can I help you procure today?</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Try one of these to get started.
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-4 max-w-lg mx-auto">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => submit(ex)}
                    className="text-xs px-3 py-2 rounded-lg bg-accent text-accent-foreground hover:bg-primary hover:text-primary-foreground transition-colors text-left"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const text = msg.parts
              .map((p) => (p.type === "text" ? p.text : ""))
              .join("");
            const search = msg.role === "assistant" ? extractSearch(text) : null;
            const display = msg.role === "assistant" ? stripSearchTag(text) : text;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent text-accent-foreground"
                  }`}
                >
                  {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`flex-1 max-w-[85%] ${msg.role === "user" ? "text-right" : ""}`}>
                  <div
                    className={`inline-block text-sm whitespace-pre-wrap rounded-2xl px-4 py-2.5 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {display || (isLoading && msg.role === "assistant" ? "…" : "")}
                  </div>
                  {search?.product && (
                    <button
                      type="button"
                      onClick={() => applySearch(search)}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      Run search for "{search.product}" <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {status === "submitted" && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-2xl px-4 py-2.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="mt-4 flex gap-2 items-end"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Describe what you need to procure…"
            rows={2}
            className="resize-none text-sm"
            disabled={isLoading}
          />
          <Button type="submit" disabled={!input.trim() || isLoading} className="h-full gap-2 px-4">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
