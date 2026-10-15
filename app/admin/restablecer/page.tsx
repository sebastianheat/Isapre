import { NuevaClave } from "@/components/RecuperarClave";
import { tokenValido } from "@/lib/recuperar-clave";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function RestablecerPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const valido = await tokenValido(token);
  return (
    <div className="admin-login-bg">
      <div className="admin-login-card">
        <NuevaClave token={token} valido={valido} />
      </div>
    </div>
  );
}
