"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Role = "admin" | "athlete" | "coach";

function roleFromPath(pathname: string | null): Role {
  const p = pathname ?? "";
  if (p.startsWith("/admin")) return "admin";
  if (p.startsWith("/coach")) return "coach";
  return "athlete";
}

function targetPathForRole(role: Role): string {
  if (role === "admin") return "/admin/dashboard";
  if (role === "coach") return "/coach";
  return "/athlete/pending";
}

export default function RoleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();

  const roleByRoute = useMemo(() => roleFromPath(pathname), [pathname]);
  const [value, setValue] = useState<Role>(roleByRoute);

  // Sempre que a rota mudar, o seletor acompanha (evita ficar “preso” em athlete)
  useEffect(() => {
    setValue(roleByRoute);
    try {
      localStorage.setItem("endure_role_view", roleByRoute);
    } catch {}
  }, [roleByRoute]);

  async function onChange(next: Role) {
    setValue(next);
    try {
      localStorage.setItem("endure_role_view", next);
    } catch {}

    const dest = targetPathForRole(next);

    // navega e força refresh (importante no mobile)
    router.push(dest);
    router.refresh();
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ fontSize: 12, color: "#6b7280" }}>Perfil:</div>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Role)}
        style={{
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          background: "#fff",
          fontWeight: 700,
          fontSize: 14,
          outline: "none",
        }}
      >
        <option value="athlete">athlete</option>
        <option value="admin">admin</option>
        <option value="coach">coach</option>
      </select>
    </div>
  );
}
