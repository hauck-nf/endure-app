"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";

type AthleteRow = {
  full_name: string | null;
  email: string | null;
  team: string | null;
  sport_primary: string | null;
};

function isUuid(x: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
}

export default function AdminAthleteHomeClient() {
  const params = useParams();
  const router = useRouter();

  const athleteId = String((params as any)?.athlete_id ?? "").trim();

  const [athlete, setAthlete] = useState<AthleteRow | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);

        // 1) valida id
        if (!athleteId || athleteId === "undefined" || !isUuid(athleteId)) {
          setErr(`athlete_id inválido: ${athleteId || "(vazio)"}`);
          return;
        }

        // 2) auth
        const { data: auth } = await supabaseBrowser.auth.getUser();
        if (!auth.user) {
          router.push("/login");
          return;
        }

        // 3) role admin
        const { data: profile, error: pErr } = await supabaseBrowser
          .from("profiles")
          .select("role")
          .eq("user_id", auth.user.id)
          .single();

        if (pErr || profile?.role !== "admin") {
          router.push("/login");
          return;
        }

        // 4) athlete data
        const { data: a, error: aErr } = await supabaseBrowser
          .from("athletes")
          .select("full_name, email, team, sport_primary")
          .eq("athlete_id", athleteId)
          .single();

        if (aErr) throw aErr;
        setAthlete(a as any);
      } catch (e: any) {
        setErr(e?.message ?? "Erro ao abrir atleta.");
      }
    })();
  }, [athleteId, router]);

  if (err) {
    return (
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Atleta inválido</h1>
        <div style={{ color: "#6b7280", marginTop: 6 }}>{err}</div>
        <div style={{ marginTop: 12 }}>
          <a href="/admin/athletes">← Voltar para Meus atletas</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{athlete?.full_name ?? "Atleta"}</h1>
        <div style={{ color: "#6b7280", fontSize: 13, marginTop: 6 }}>
          {athlete?.email ?? "—"} • {athlete?.team ?? "—"} • {athlete?.sport_primary ?? "—"}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
        <a
          href={`/admin/athletes/${athleteId}/assigned`}
          style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, textDecoration: "none", color: "inherit", fontWeight: 600, background: "#fff" }}
        >
          Avaliações designadas
        </a>

        <a
          href={`/admin/athletes/${athleteId}/dashboard`}
          style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, textDecoration: "none", color: "inherit", fontWeight: 600, background: "#fff" }}
        >
          Dashboard do atleta
        </a>

        <a
          href={`/admin/athletes/${athleteId}/profile`}
          style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, textDecoration: "none", color: "inherit", fontWeight: 600, background: "#fff" }}
        >
          Dados cadastrais
        </a>
      </div>

      <div style={{ marginTop: 8 }}>
        <a href="/admin/athletes">← Voltar</a>
      </div>
    </div>
  );
}
