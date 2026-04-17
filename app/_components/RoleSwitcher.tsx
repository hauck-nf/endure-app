"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";

type ProfileRow = {
  roles: string[] | null;
  active_role: string | null;
};

function routeFor(role: string) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "coach") return "/coach/dashboard";
  return "/athlete";
}

export default function RoleSwitcher() {
  const router = useRouter();
  const [roles, setRoles] = useState<string[]>([]);
  const [activeRole, setActiveRole] = useState<string>("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabaseBrowser.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return;

      const { data, error } = await supabaseBrowser
        .from("profiles")
        .select("roles, active_role")
        .eq("user_id", userId)
        .single<ProfileRow>();

      if (error) {
        setMsg(error.message);
        return;
      }

      const r = data?.roles ?? [];
      const a = data?.active_role ?? (r[0] ?? "");

      setRoles(r);
      setActiveRole(a);
    })();
  }, []);

  async function onChange(newRole: string) {
    setMsg("");
    setActiveRole(newRole);

    const { error } = await supabaseBrowser.rpc("set_active_role", { p_role: newRole });
    if (error) {
      setMsg(error.message);
      return;
    }

    router.push(routeFor(newRole));
    router.refresh();
  }

  if (!roles || roles.length <= 1) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12, opacity: 0.75 }}>Perfil:</span>
      <select
        value={activeRole}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: "6px 10px", borderRadius: 10 }}
      >
        {roles.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      {msg ? <span style={{ fontSize: 12, opacity: 0.85 }}>{msg}</span> : null}
    </div>
  );
}
