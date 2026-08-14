import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound, Loader2, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/change-password")({
  head: () => ({
    meta: [
      { title: "Change Password — Opus-Procure AI" },
      {
        name: "description",
        content: "Update the password for your Opus-Procure AI employee account.",
      },
      { property: "og:title", content: "Change Password — Opus-Procure AI" },
      {
        property: "og:description",
        content: "Securely update your Opus-Procure AI account password.",
      },
    ],
  }),
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) return setError(updateError.message);
    setDone(true);
    setPassword("");
    setConfirm("");
  }

  return (
    <AppShell>
      <div className="max-w-md mx-auto card-elevated p-6">
        <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <KeyRound className="w-4 h-4" /> Change password
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a strong password of at least 8 characters.
        </p>

        {error && (
          <div className="mt-4 text-sm rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-3 py-2">
            {error}
          </div>
        )}
        {done && (
          <div className="mt-4 text-sm rounded-md border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-3 py-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Password updated.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="np">New password</Label>
            <Input
              id="np"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp">Confirm new password</Label>
            <Input
              id="cp"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Update password
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
