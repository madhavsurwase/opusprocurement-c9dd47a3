import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });

    const { data: employee } = await supabase
      .from("employees")
      .select("id, name, company_email, employee_id, is_active")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!employee || !employee.is_active) {
      await supabase.auth.signOut();
      throw redirect({ to: "/login" });
    }

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });

    return { user: data.user, employee, isAdmin: Boolean(isAdmin) };
  },
  component: () => <Outlet />,
});
