import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bootstrapAdmin, needsBootstrap, registerLogin, resolveLoginEmail } from "@/lib/auth.functions";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Employee Sign In — Opus-Procure AI" },
      {
        name: "description",
        content:
          "Secure employee sign in for Opus-Procure AI. Access procurement dashboards, vendor search and the AI assistant.",
      },
      { property: "og:title", content: "Employee Sign In — Opus-Procure AI" },
      {
        property: "og:description",
        content: "Secure company sign in for the Opus-Procure AI procurement platform.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const resolve = useServerFn(resolveLoginEmail);
  const register = useServerFn(registerLogin);
  const checkBootstrap = useServerFn(needsBootstrap);
  const bootstrap = useServerFn(bootstrapAdmin);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupMode, setSetupMode] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [setupName, setSetupName] = useState("");
  const [setupEmail, setSetupEmail] = useState("");
  const [setupEmpId, setSetupEmpId] = useState("");
  const [setupPassword, setSetupPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
    checkBootstrap().then((r) => setShowSetup(r.needsBootstrap)).catch(() => {});
  }, []);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { email } = await resolve({ data: { identifier } });
      if (!email) throw new Error("Invalid credentials or inactive account.");

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw new Error("Invalid credentials or inactive account.");

      const result = await register({ data: undefined });
      if (!result.active) {
        await supabase.auth.signOut();
        throw new Error("Your account is inactive. Contact your administrator.");
      }
      navigate({ to: "/", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await bootstrap({
        data: {
          name: setupName,
          email: setupEmail,
          employeeId: setupEmpId,
          password: setupPassword,
        },
      });
      setSetupMode(false);
      setShowSetup(false);
      setIdentifier(setupEmail);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex w-[45%] flex-col justify-between p-12 bg-[var(--color-sidebar)] text-white">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-md gradient-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold tracking-tight">Opus-Procure AI</span>
        </div>
        <div>
          <h2 className="text-3xl font-semibold tracking-tight leading-tight">
            Enterprise procurement intelligence
          </h2>
          <p className="text-white/70 mt-3 text-sm max-w-sm">
            Vendor discovery, AI recommendations and supplier outreach — secured for authorised
            company employees only.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <ShieldCheck className="w-4 h-4" />
          Company-managed access · Microsoft SSO ready
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-md gradient-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold tracking-tight">Opus-Procure AI</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">
            {setupMode ? "Create administrator" : "Employee sign in"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {setupMode
              ? "One-time setup for the first administrator account."
              : "Use your company email or employee ID."}
          </p>

          {error && (
            <div className="mt-4 text-sm rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-3 py-2">
              {error}
            </div>
          )}

          {setupMode ? (
            <form onSubmit={handleSetup} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="sname">Full name</Label>
                <Input id="sname" value={setupName} onChange={(e) => setSetupName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="semail">Company email</Label>
                <Input id="semail" type="email" value={setupEmail} onChange={(e) => setSetupEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sid">Employee ID</Label>
                <Input id="sid" value={setupEmpId} onChange={(e) => setSetupEmpId(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="spass">Password</Label>
                <Input id="spass" type="password" minLength={8} value={setupPassword} onChange={(e) => setSetupPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Create administrator
              </Button>
              <button
                type="button"
                onClick={() => setSetupMode(false)}
                className="text-xs text-muted-foreground hover:text-foreground w-full"
              >
                Back to sign in
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignIn} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="identifier">Company email / Employee ID</Label>
                <Input
                  id="identifier"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@company.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Sign in
              </Button>
              {showSetup && (
                <button
                  type="button"
                  onClick={() => setSetupMode(true)}
                  className="text-xs text-primary hover:underline w-full"
                >
                  First-time setup: create the administrator account
                </button>
              )}
              <p className="text-[11px] text-muted-foreground text-center pt-2">
                Accounts are provisioned by your administrator. Microsoft Entra ID sign-in can be
                enabled later without changing this login.
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
