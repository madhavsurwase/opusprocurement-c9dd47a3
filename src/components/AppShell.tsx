import { Link, useRouterState, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Search,
  MessageSquare,
  History,
  Sparkles,
  Users,
  LogOut,
  KeyRound,
  UserCircle2,
} from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  disabled?: boolean;
  adminOnly?: boolean;
};

const nav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/search", label: "Vendor Search", icon: Search },
  { to: "/assistant", label: "AI Assistant", icon: MessageSquare },
  { to: "/admin", label: "Employees", icon: Users, adminOnly: true },
  { to: "/history", label: "Recent Searches", icon: History, disabled: true },
];

type ShellContext = {
  isAdmin?: boolean;
  employee?: { name: string; company_email: string; employee_id: string } | null;
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const matches = useRouterState({ select: (s) => s.matches });
  const ctx = (matches.find((m) => m.routeId === "/_authenticated")?.context ??
    {}) as ShellContext;
  const isAdmin = Boolean(ctx.isAdmin);
  const employee = ctx.employee ?? null;

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.invalidate();
    navigate({ to: "/login", replace: true });
  }

  const visibleNav = nav.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-[var(--color-sidebar)] text-[var(--color-sidebar-foreground)] border-r border-[var(--color-sidebar-border)]">
        <div className="px-6 py-5 flex items-center gap-2 border-b border-[var(--color-sidebar-border)]">
          <div className="w-9 h-9 rounded-md gradient-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-sm tracking-tight text-white">Opus-Procure AI</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleNav.map((item) => {
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
          <div className="md:hidden font-semibold">Opus-Procure AI</div>
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
              Live
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <UserCircle2 className="w-4 h-4" />
                  <span className="hidden sm:inline max-w-[160px] truncate">
                    {employee?.name ?? "Account"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>
                  <div className="font-medium">{employee?.name ?? "Signed in"}</div>
                  <div className="text-xs text-muted-foreground font-normal truncate">
                    {employee?.company_email}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-normal mt-1">
                    {isAdmin ? "Admin" : "Procurement User"}
                    {employee?.employee_id ? ` · ${employee.employee_id}` : ""}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin">
                      <Users className="w-4 h-4 mr-2" /> Employee management
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/change-password">
                    <KeyRound className="w-4 h-4 mr-2" /> Change password
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="flex-1 p-6">{children}</div>
      </main>
    </div>
  );
}
