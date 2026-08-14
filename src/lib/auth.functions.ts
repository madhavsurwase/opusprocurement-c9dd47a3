import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Resolves a login identifier (company email OR employee ID) to the company
 * email used by the auth provider. Returns null when unknown/inactive so the
 * login form can show a single generic error (no account enumeration detail).
 */
export const resolveLoginEmail = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ identifier: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const identifier = data.identifier.trim();

    const column = identifier.includes("@") ? "company_email" : "employee_id";
    const value = identifier.includes("@") ? identifier.toLowerCase() : identifier.toUpperCase();

    const { data: row } = await supabaseAdmin
      .from("employees")
      .select("company_email, is_active")
      .eq(column, value)
      .maybeSingle();

    if (!row || !row.is_active) return { email: null as string | null };
    return { email: row.company_email };
  });

/** True when no employee exists yet — enables one-time admin bootstrap. */
export const needsBootstrap = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("employees")
    .select("id", { count: "exact", head: true });
  return { needsBootstrap: (count ?? 0) === 0 };
});

const bootstrapSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  employeeId: z.string().min(1).max(40),
  password: z.string().min(8).max(72),
});

/** Creates the very first Admin account. Only possible while the directory is empty. */
export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((input) => bootstrapSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("employees")
      .select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) throw new Error("Setup already completed.");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.toLowerCase(),
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create admin account.");

    await supabaseAdmin.from("employees").insert({
      id: created.user.id,
      name: data.name,
      company_email: data.email.toLowerCase(),
      employee_id: data.employeeId.toUpperCase(),
      is_active: true,
    });
    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "admin" });

    return { ok: true };
  });

/** Stamps last_login for the signed-in employee and returns their profile + role. */
export const registerLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: employee } = await supabaseAdmin
      .from("employees")
      .select("id, name, company_email, employee_id, is_active")
      .eq("id", context.userId)
      .maybeSingle();

    if (!employee || !employee.is_active) return { active: false as const };

    await supabaseAdmin
      .from("employees")
      .update({ last_login: new Date().toISOString() })
      .eq("id", context.userId);

    return { active: true as const };
  });

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

export const listEmployees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: employees } = await supabaseAdmin
      .from("employees")
      .select("id, name, company_email, employee_id, is_active, created_at, last_login")
      .order("created_at", { ascending: false });
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");

    const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
    return (employees ?? []).map((e) => ({
      ...e,
      role: (roleMap.get(e.id) ?? "procurement_user") as "admin" | "procurement_user",
    }));
  });

const createSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  employeeId: z.string().min(1).max(40),
  role: z.enum(["admin", "procurement_user"]),
});

function generateTempPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = crypto.getRandomValues(new Uint32Array(14));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** Admin-only: creates an auth account with a generated temporary password. */
export const createEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const tempPassword = generateTempPassword();
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.toLowerCase(),
      password: tempPassword,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create the account.");

    const { error: insertError } = await supabaseAdmin.from("employees").insert({
      id: created.user.id,
      name: data.name,
      company_email: data.email.toLowerCase(),
      employee_id: data.employeeId.toUpperCase(),
      is_active: true,
    });
    if (insertError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(insertError.message);
    }

    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: data.role });

    // Returned once so the admin can hand it over; never persisted in plaintext.
    return { tempPassword };
  });

export const setEmployeeActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id === context.userId) throw new Error("You cannot deactivate your own account.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.from("employees").update({ is_active: data.active }).eq("id", data.id);
    // Revoke existing sessions immediately when deactivating.
    if (!data.active) await supabaseAdmin.auth.admin.signOut(data.id, "global");
    return { ok: true };
  });

export const resetEmployeePassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tempPassword = generateTempPassword();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      password: tempPassword,
    });
    if (error) throw new Error(error.message);
    return { tempPassword };
  });
