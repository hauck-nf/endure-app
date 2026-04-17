"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";
import { getMyAthleteId } from "@/src/lib/athlete";

type Row = {
  request_id: string;
  title: string | null;
  status: string;
  due_at: string | null;
  created_at: string;
};

export default function AthletePendingPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        setLoading(true);

        // ✅ mobile-safe: usa getSession (não depende do server)
        const { data: sess } = await supabaseBrowser.auth.getSession();
        if (!sess.session) {
          router.push("/login?next=/athlete/pending");
          return;
        }

        const athleteId = await getMyAthleteId();

        const { data, error } = await supabaseBrowser
          .from("assessment_requests")
          .select("request_id, title, status, due_at, created_at")
          .eq("athlete_id", athleteId)
          .in("status", ["pending", "in_progress"])
          .order("created_at", { ascending: false })
          .limit(200);

        if (error) throw error;
        setRows((data ?? []) as any);
      } catch (e: any) {
        setErr(e?.message ?? "Erro ao carregar pendências.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) return <div style={{ padding: 16, color: "#6b7280" }}>Carregando…</div>;

  if (err) {
    return (
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Pendentes</h1>
        <div style={{ marginTop: 8, color: "#b91c1c" }}>{err}</div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Pendentes</h1>
        <div style={{ fontSize: 12, color: "#6b7280" }}>{rows.length} avaliação(ões)</div>
      </div>

      {rows.length === 0 ? (
        <div style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 12, padding: 14, color: "#6b7280" }}>
          Nenhuma avaliação pendente.
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((r) => (
          <a
            key={r.request_id}
            href={`/athlete/flow/${r.request_id}`}
            style={{
              textDecoration: "none",
              color: "inherit",
              border: "1px solid #e5e7eb",
              background: "#fff",
              borderRadius: 12,
              padding: 14,
              display: "grid",
              gap: 6,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14 }}>{r.title ?? "Avaliação"}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, color: "#6b7280" }}>
              <span>Status: {r.status}</span>
              <span>Prazo: {r.due_at ?? "—"}</span>
            </div>

            <div style={{ marginTop: 4 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 34,
                  padding: "0 10px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#111827",
                }}
              >
                Abrir avaliação →
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
