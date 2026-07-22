import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Send,
  Sparkles,
  Loader2,
  User,
  Bot,
  Star,
  MapPin,
  Phone,
  Globe,
  Mail,
  Map as MapIcon,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { searchVendors, type Vendor, type SearchResult } from "@/lib/places.functions";
import { sendProcurementEmail } from "@/lib/send-email";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "AI Assistant — OpusProcureAI" },
      {
        name: "description",
        content:
          "Quickly discover vendors in Pune by chatting naturally — the OpusProcureAI assistant finds suppliers and drafts your inquiry email.",
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
  "I need a wireless mouse.",
  "I need 20 office chairs.",
  "Find Dell laptop suppliers.",
  "I need HDMI cables.",
];

const CHAT_KEY = "opusprocure.chat.v2";
const PROC_EMAIL = "procurement@opusprocure.com";

type ExtractedSearch = {
  product?: string;
  quantity?: string | null;
  brand?: string | null;
  category?: string | null;
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

function buildEmail(vendor: Vendor, product: string, quantity?: string | null) {
  const subject = `Procurement Inquiry – ${product}`;
  const qtyBlock = quantity ? `\n\nQuantity:\n${quantity}` : "";
  const body = `Dear Sir/Madam,

We are currently looking to procure the following item for our organization.

Product:
${product}${qtyBlock}

If your company is interested in supplying this requirement, kindly reach out to our Procurement Team using the email address below.

Procurement Email:
${PROC_EMAIL}

We would be happy to discuss the requirement further and share additional details.

Thank you for your time.

Thanks & Regards,

Opus Procurement Team`;
  const to = vendor.email ?? "";
  return {
    subject,
    body,
    mailto: `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  };
}

function VendorCardInline({
  vendor,
  product,
  quantity,
}: {
  vendor: Vendor;
  product: string;
  quantity?: string | null;
}) {
  const handleSendEmail = () => {
    const { mailto } = buildEmail(vendor, product, quantity);
    window.location.href = mailto;
  };

  const recommendation = vendor.topRecommended
    ? "Top pick — highest rated supplier matching your request in Pune."
    : vendor.rating && vendor.rating >= 4.5
      ? "Highly rated supplier with excellent customer reviews and strong local presence."
      : vendor.rating && vendor.rating >= 4
        ? "Well-reviewed local supplier — reliable choice for your requirement."
        : "Verified Pune-based supplier — worth reaching out for a quote.";

  return (
    <div className="card-elevated p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm leading-snug truncate">{vendor.name}</h3>
          {vendor.category && (
            <p className="text-xs text-muted-foreground mt-0.5">{vendor.category}</p>
          )}
        </div>
        {vendor.rating != null && (
          <div className="flex items-center gap-1 text-xs font-medium shrink-0 bg-amber-50 text-amber-700 px-2 py-1 rounded-md">
            <Star className="w-3 h-3 fill-amber-500 stroke-amber-500" />
            {vendor.rating.toFixed(1)}
            {vendor.reviews ? (
              <span className="text-amber-600/70">({vendor.reviews})</span>
            ) : null}
          </div>
        )}
      </div>

      <div className="space-y-1.5 text-xs text-muted-foreground">
        {vendor.address && (
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span className="line-clamp-2">{vendor.address}</span>
          </div>
        )}
        {vendor.phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <a href={`tel:${vendor.phone}`} className="hover:text-foreground">
              {vendor.phone}
            </a>
          </div>
        )}
        {vendor.website && (
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <a
              href={vendor.website}
              target="_blank"
              rel="noreferrer"
              className="truncate hover:text-foreground"
            >
              {vendor.website.replace(/^https?:\/\//, "")}
            </a>
          </div>
        )}
        {vendor.email && (
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <a href={`mailto:${vendor.email}`} className="truncate hover:text-foreground">
              {vendor.email}
            </a>
          </div>
        )}
      </div>

      <div className="rounded-md bg-primary/5 border border-primary/10 p-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-primary mb-0.5">
          Recommended because
        </p>
        <p className="text-xs text-foreground/80 leading-relaxed">{recommendation}</p>
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          onClick={handleSendEmail}
          className="flex-1 gap-1.5 h-8 text-xs"
        >
          <Mail className="w-3.5 h-3.5" />
          Send Email
        </Button>
        <Button
          size="sm"
          variant="outline"
          asChild
          className="gap-1.5 h-8 text-xs"
        >
          <a href={vendor.mapsUrl} target="_blank" rel="noreferrer">
            <MapIcon className="w-3.5 h-3.5" />
            Maps
          </a>
        </Button>
      </div>
    </div>
  );
}

type SearchState =
  | { status: "loading" }
  | { status: "ready"; data: SearchResult; product: string; quantity?: string | null }
  | { status: "error"; error: string };

function AssistantPage() {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [searches, setSearches] = useState<Record<string, SearchState>>({});
  const runningRef = useRef<Set<string>>(new Set());

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

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

  useEffect(() => {
    if (messages.length > 0) {
      try {
        window.localStorage.setItem(CHAT_KEY, JSON.stringify(messages));
      } catch {}
    }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, status, searches]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [status]);

  const isLoading = status === "submitted" || status === "streaming";

  // Auto-run vendor search whenever an assistant message finalizes a <search> block
  const assistantSearchTargets = useMemo(() => {
    const targets: Array<{ id: string; extracted: ExtractedSearch }> = [];
    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      const text = msg.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
      const extracted = extractSearch(text);
      if (extracted?.product) targets.push({ id: msg.id, extracted });
    }
    return targets;
  }, [messages]);

  useEffect(() => {
    if (isLoading) return;
    for (const { id, extracted } of assistantSearchTargets) {
      if (searches[id] || runningRef.current.has(id)) continue;
      const product = extracted.product!;
      const brand = extracted.brand ? `${extracted.brand} ` : "";
      const query = `${brand}${product}`.trim();
      runningRef.current.add(id);
      setSearches((s) => ({ ...s, [id]: { status: "loading" } }));
      searchVendors({ data: { query } })
        .then((data) => {
          setSearches((s) => ({
            ...s,
            [id]: {
              status: "ready",
              data,
              product,
              quantity: extracted.quantity ?? null,
            },
          }));
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : "Search failed";
          setSearches((s) => ({ ...s, [id]: { status: "error", error: msg } }));
        })
        .finally(() => {
          runningRef.current.delete(id);
        });
    }
  }, [assistantSearchTargets, isLoading, searches]);

  const submit = (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || isLoading) return;
    setInput("");
    void sendMessage({ text: value });
  };

  const clearChat = () => {
    setMessages([]);
    setSearches({});
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
              Quick Procurement
            </p>
            <h1 className="text-3xl font-semibold tracking-tight mt-1">AI Assistant</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Chat naturally — I'll find Pune suppliers and draft your inquiry email.
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
              <h2 className="font-semibold tracking-tight">
                What do you need to procure?
              </h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Just type it in plain English. Try one of these:
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
            const text = msg.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
            const display =
              msg.role === "assistant" ? stripSearchTag(text) : text;
            const search = msg.role === "assistant" ? searches[msg.id] : undefined;

            return (
              <div key={msg.id} className="space-y-3">
                <div
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent text-accent-foreground"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                  <div
                    className={`flex-1 max-w-[85%] ${msg.role === "user" ? "text-right" : ""}`}
                  >
                    <div
                      className={`inline-block text-sm whitespace-pre-wrap rounded-2xl px-4 py-2.5 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {display ||
                        (isLoading && msg.role === "assistant" ? "…" : "")}
                    </div>
                  </div>
                </div>

                {search && (
                  <div className="ml-11 space-y-3">
                    {search.status === "loading" && (
                      <div className="inline-flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Finding suppliers in Pune…
                      </div>
                    )}
                    {search.status === "error" && (
                      <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                        {search.error}
                      </div>
                    )}
                    {search.status === "ready" && (
                      <>
                        {search.data.vendors.length === 0 ? (
                          <div className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
                            No matching suppliers found in Pune. Try rephrasing.
                          </div>
                        ) : (
                          <>
                            <p className="text-xs text-muted-foreground">
                              Found {search.data.vendors.length} suppliers in Pune — showing top {Math.min(6, search.data.vendors.length)}.
                            </p>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {search.data.vendors.slice(0, 6).map((v) => (
                                <VendorCardInline
                                  key={v.id}
                                  vendor={v}
                                  product={search.product}
                                  quantity={search.quantity}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
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
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="e.g. I need a wireless mouse."
            rows={2}
            className="resize-none text-sm"
            disabled={isLoading}
            autoFocus
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="h-full gap-2 px-4"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
