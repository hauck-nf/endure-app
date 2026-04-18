"use client";

import { usePathname } from "next/navigation";

type Profile = "admin" | "athlete";

function currentFromPath(pathname: string): Profile {
  if (pathname.startsWith("/admin")) return "admin";
  // tudo que não é /admin cai como athlete (inclui /athlete e páginas públicas após login)
  return "athlete";
}

export default function ProfileSwitcher() {
  const pathname = usePathname();
  const current = currentFromPath(pathname);

  function go(next: Profile) {
    if (next === current) return;
    if (next === "admin") window.location.assign("/admin/dashboard");
    else window.location.assign("/athlete/pending");
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ fontSize: 14, color: "#6b7280" }}>Perfil:</div>
      <select
        value={current}
        onChange={(e) => go(e.target.value as Profile)}
        style={{
          height: 40,
          padding: "0 12px",
          borderRadius: 14,
          border: "1px solid #e5e7eb",
          background: "#fff",
          fontWeight: 800,
          outline: "none",
        }}
      >
        <option value="athlete">athlete</option>
        <option value="admin">admin</option>
      </select>
    </div>
  );
}
