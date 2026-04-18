"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";

type Role = "admin" | "coach" | "athlete" | "unknown";

export default function ProfileSwitcher() {
  const router = useRouter();
  const pathname = usePathname();

  const [actualRole, setActualRole] = useState<Role>("unknown");
  const [loading, setLoading] = useState(true);

  // 1) Descobre o role REAL do usuário (do banco)
  useEffect(() => {
    (async () => {
      try {
        const { data: sess } = await supabaseBrowser.auth.getSession();
        const user = sess.session?.user;
        if (!user) {
          setActualRole("unknown");
          return;
        }

        const { data: profile } = await supabaseBrowser
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        setActualRole((profile?.role as Role) ?? "unknown");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 2) "Modo exibido" depende da rota atual (não do timing do role)
  const viewMode: "admin" | "athlete" = pathname.startsWith("/admin") ? "admin" : "athlete";

  // 3) Opções: só admin pode alternar
  const options = useMemo(() => {
    if (actualRole === "admin") {
      return [
        { value: "admin", label: "admin" },
        { value: "athlete", label: "athlete" },
      ];
    }
    // atleta/coaches: sem alternância (mantém consistente)
    return [{ value: "athlete", label: "athlete" }];
  }, [actualRole]);

  function onChange(next: string) {
  // hard redirect = mais confiável em mobile/produção
  if (next === "admin") window.location.assign("/admin/dashboard");
  else window.location.assign("/athlete/pending");
}

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ fontSize: 12, color: "#6b7280" }}>Perfil:</div>

      <select
        disabled={loading || options.length === 1}
        value={viewMode}
        onChange={(e) => onChange(e.target.value)}
        style={{
          height: 40,
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          background: "#fff",
          padding: "0 10px",
          fontWeight: 600,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
