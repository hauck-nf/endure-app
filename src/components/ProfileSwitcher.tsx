"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";

type Role = "admin" | "coach" | "athlete" | "unknown";

export default function ProfileSwitcher() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("unknown");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: sess } = await supabaseBrowser.auth.getSession();
        const user = sess.session?.user;
        if (!user) {
          setRole("unknown");
          setLoading(false);
          return;
        }

        const { data: profile } = await supabaseBrowser
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        setRole((profile?.role as Role) ?? "unknown");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const options = useMemo(() => {
    const base = [{ value: "athlete", label: "athlete" }];
    if (role === "admin") base.push({ value: "admin", label: "admin" });
    return base;
  }, [role]);

  function onChange(v: string) {
    if (v === "admin") router.push("/admin/dashboard");
    else router.push("/athlete/pending");
    router.refresh();
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ fontSize: 12, color: "#6b7280" }}>Perfil:</div>
      <select
        disabled={loading || options.length === 1}
        value={role === "admin" ? "admin" : "athlete"}
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
