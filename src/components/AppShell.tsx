import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Search, MessageSquare, History, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  disabled?: boolean;
};

const nav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/search", label: "Vendor Search", icon: Search },
  { to: "/chat", label: "AI Assistant", icon: MessageSquare, disabled: true },
  { to: "/history", label: "Recent Searches", icon: History, disabled: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-[var(--color-sidebar)] text-[var(--color-sidebar-foreground)] border-r border-[var(--color-sidebar-border)]">
        <div className="px-6 py-5 flex items-center gap-2 border-b border-[var(--color-sidebar-border)]">
          <div className="w-9 h-9 rounded-md gradient-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-sm tracking-tight text-white">OpusProcureAI</div>
            <div className="text-[11px] text-white/60">Enterprise Procurement</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            const cls = `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              active
                ? "bg-[var(--color-sidebar-accent)] text-white"
                : "text-white/70 hover:bg-[var(--color-sidebar-accent)] hover:text-white"
            } ${item.disabled ? "opacity-50 pointer-events-none" : ""}`;
            return item.disabled ? (
              <div key={item.to} className={cls}>
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                <span className="ml-auto text-[10px] uppercase tracking-wider text-white/40">
                  Soon
                </span>
              </div>
            ) : (
              <Link key={item.to} to={item.to} className={cls}>
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 text-[11px] text-white/40 border-t border-[var(--color-sidebar-border)]">
          Region: Pune, Maharashtra
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 border-b border-border bg-card flex items-center px-6 gap-4">
          <div className="md:hidden font-semibold">OpusProcureAI</div>
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
              Live
            </span>
            <span className="hidden sm:inline">Powered by Lovable AI</span>
          </div>
        </header>
        <div className="flex-1 p-6">{children}</div>
      </main>
    </div>
  );
}
