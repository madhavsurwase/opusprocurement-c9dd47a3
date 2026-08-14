import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, UserPlus, ShieldCheck, KeyRound, Copy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  createEmployee,
  listEmployees,
  resetEmployeePassword,
  setEmployeeActive,
} from "@/lib/auth.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Employee Management — Opus-Procure AI" },
      {
        name: "description",
        content:
          "Administrator console to create employees, assign procurement roles and deactivate accounts.",
      },
      { property: "og:title", content: "Employee Management — Opus-Procure AI" },
      {
        property: "og:description",
        content: "Manage company employees and procurement access in Opus-Procure AI.",
      },
    ],
  }),
  component: AdminPage,
});

function fmt(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AdminPage() {
  const { isAdmin } = Route.useRouteContext();
  const qc = useQueryClient();
  const fetchEmployees = useServerFn(listEmployees);
  const create = useServerFn(createEmployee);
  const toggle = useServerFn(setEmployeeActive);
  const resetPassword = useServerFn(resetEmployeePassword);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [role, setRole] = useState<"admin" | "procurement_user">("procurement_user");
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<{ email: string; password: string } | null>(null);

  const employees = useQuery({
    queryKey: ["employees"],
    queryFn: () => fetchEmployees(),
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: () => create({ data: { name, email, employeeId, role } }),
    onSuccess: (res) => {
      setTempPassword({ email, password: res.tempPassword });
      setName("");
      setEmail("");
      setEmployeeId("");
      setRole("procurement_user");
      setError(null);
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => toggle({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
    onError: (e: Error) => setError(e.message),
  });

  const resetMutation = useMutation({
    mutationFn: (v: { id: string; email: string }) =>
      resetPassword({ data: { id: v.id } }).then((r) => ({ ...r, email: v.email })),
    onSuccess: (res) => setTempPassword({ email: res.email, password: res.tempPassword }),
    onError: (e: Error) => setError(e.message),
  });

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto card-elevated p-8 text-center">
          <ShieldCheck className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <h1 className="font-semibold tracking-tight">Administrator access required</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your account does not have permission to manage employees.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Administration
          </p>
          <h1 className="text-3xl font-semibold tracking-tight mt-1">Employee Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Provision company accounts, assign roles and deactivate access.
          </p>
        </div>

        {error && (
          <div className="text-sm rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-3 py-2">
            {error}
          </div>
        )}

        <div className="card-elevated p-6">
          <h2 className="font-semibold tracking-tight flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Add employee
          </h2>
          <form
            className="grid md:grid-cols-5 gap-3 mt-4 items-end"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="n">Name</Label>
              <Input id="n" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e">Company email</Label>
              <Input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="i">Employee ID</Label>
              <Input id="i" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="procurement_user">Procurement User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create account
            </Button>
          </form>
        </div>

        <div className="card-elevated overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold tracking-tight">Employee directory</h2>
          </div>
          {employees.isLoading ? (
            <div className="p-10 text-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-6 py-3">Name</th>
                    <th className="text-left font-medium px-6 py-3">Email</th>
                    <th className="text-left font-medium px-6 py-3">Employee ID</th>
                    <th className="text-left font-medium px-6 py-3">Role</th>
                    <th className="text-left font-medium px-6 py-3">Created</th>
                    <th className="text-left font-medium px-6 py-3">Last login</th>
                    <th className="text-left font-medium px-6 py-3">Active</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(employees.data ?? []).map((emp) => (
                    <tr key={emp.id}>
                      <td className="px-6 py-3 font-medium">{emp.name}</td>
                      <td className="px-6 py-3 text-muted-foreground">{emp.company_email}</td>
                      <td className="px-6 py-3">{emp.employee_id}</td>
                      <td className="px-6 py-3">
                        <Badge variant={emp.role === "admin" ? "default" : "secondary"}>
                          {emp.role === "admin" ? "Admin" : "Procurement User"}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">{fmt(emp.created_at)}</td>
                      <td className="px-6 py-3 text-muted-foreground">{fmt(emp.last_login)}</td>
                      <td className="px-6 py-3">
                        <Switch
                          checked={emp.is_active}
                          onCheckedChange={(v) => toggleMutation.mutate({ id: emp.id, active: v })}
                        />
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => resetMutation.mutate({ id: emp.id, email: emp.company_email })}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          Reset password
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!tempPassword} onOpenChange={(o) => !o && setTempPassword(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary password</DialogTitle>
            <DialogDescription>
              Share this once with {tempPassword?.email}. It is not stored anywhere and cannot be
              retrieved again. Ask the employee to change it after signing in.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md bg-muted px-3 py-2 font-mono text-sm break-all">
              {tempPassword?.password}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigator.clipboard.writeText(tempPassword?.password ?? "")}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
