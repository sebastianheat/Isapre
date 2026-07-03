import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const sesion = await obtenerSesion();
  if (sesion) redirect("/admin/leads");
  return (
    <div className="admin-login-bg">
      <div className="admin-login-card">
        <LoginForm />
      </div>
    </div>
  );
}
