"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type Role = "admin" | "athlete";

function roleFromPath(pathname: string | null): Role {
  const p = pathname ?? "";
  if (p.startsWith("/admin")) return "admin";
  return "athlete";
}

function targetPathForRole(role: Role): string {
  if (role === "admin") return "/admin/dashboard";
  return "/athlete/pending";
}

export default function RoleSwitcher() {
  const pathname = usePathname();
  const roleByRoute = useMemo(() => roleFromPath(pathname), [pathname]);
  const [value, setValue] = useState<Role>(roleByRoute);

  useEffect(() => {
    setValue(roleByRoute);
    try { localStorage.setItem("endure_role_view", roleByRoute); } catch {}
  }, [roleByRoute]);

  function onChange(next: Role) {
    setValue(next);
    try { localStorage.setItem("endure_role_view", next); } catch {}
    window.location.assign(targetPathForRole(next));
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
      </select>
    </div>
  );
}
