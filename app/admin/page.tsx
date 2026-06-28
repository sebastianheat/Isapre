import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const sesion = await obtenerSesion();
  if (sesion) redirect("/admin/leads");
  return (
    <div className="admin-shell" style={{ paddingBottom: 0, alignItems: "center", justifyContent: "center", display: "flex", minHeight: "100dvh" }}>
      <div className="admin-content" style={{ maxWidth: 460 }}>
        <LoginForm />
      </div>
    </div>
  );
}
