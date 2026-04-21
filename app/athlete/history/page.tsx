"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";
import { getMyAthleteId } from "@/src/lib/athlete";

type Row = {
  assessment_id: string;
  instrument_version: string | null;
  created_at: string | null;
  submitted_at: string | null;
};

function fmtDate(iso?: string | null) {
  if (!iso) return "â€”";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

export default function AthleteHistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const countLabel = useMemo(() => {
    const n = rows.length;
    return n === 1 ? "1 avaliaÃ§Ã£o" : `${n} avaliaÃ§Ãµes`;
  }, [rows.length]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const athleteId = await getMyAthleteId();
        if (!athleteId) {
          throw new Error("VocÃª ainda nÃ£o tem cadastro de atleta.");
        }

        const { data, error } = await supabase
          .from("assessments")
          .select("assessment_id,instrument_version,created_at,submitted_at")
          .eq("athlete_id", athleteId)
          .not("submitted_at", "is", null) // âœ… nÃ£o depende de status
          .order("submitted_at", { ascending: false })
          .limit(200);

        if (error) throw error;

        const safe = (data ?? []) as Row[];
        if (alive) setRows(safe);
      } catch (e: any) {
        if (alive) {
          setRows([]);
          setErr(e?.message ?? String(e));
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div style={{ maxWidth: 980 }}>
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: 999,
            background: "#f8fafc",
            color: "#111827",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Ãrea do atleta
        </div>

        <h1 style={{ marginTop: 14, marginBottom: 6, fontSize: 40, lineHeight: 1.1 }}>
          HistÃ³rico de avaliaÃ§Ãµes
        </h1>

        <div style={{ color: "#475569", fontSize: 16 }}>
          Consulte aqui as avaliaÃ§Ãµes concluÃ­das e abra o relatÃ³rio sempre que quiser revisitar seus resultados.
        </div>

        <div style={{ marginTop: 14 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 14px",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              fontWeight: 700,
              color: "#111827",
            }}
          >
            {loading ? "Carregandoâ€¦" : countLabel}
          </span>
        </div>
      </div>

      {err && (
        <div
          style={{
            padding: 14,
            borderRadius: 14,
            border: "1px solid #fecaca",
            background: "#fff1f2",
            color: "#9f1239",
            marginBottom: 14,
            fontWeight: 600,
          }}
        >
          {err}
        </div>
      )}

      {(!loading && rows.length === 0 && !err) && (
        <div
          style={{
            padding: 18,
            borderRadius: 16,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            color: "#475569",
          }}
        >
          Nenhuma avaliaÃ§Ã£o concluÃ­da ainda.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {rows.map((r) => (
          <div
            key={r.assessment_id}
            style={{
              borderRadius: 18,
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              padding: 18,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
              <div style={{ fontWeight: 900, fontSize: 18, color: "#0f172a" }}>
                {r.instrument_version ?? "ENDURE"}
              </div>
              <div style={{ color: "#64748b", fontWeight: 600 }}>
                {fmtDate(r.submitted_at ?? r.created_at)}
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              {/* âœ… link normal: SEM popup, SEM about:blank, funciona no mobile */}
              <Link
                href={`/athlete/reports/${r.assessment_id}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 44,
                  padding: "0 18px",
                  borderRadius: 16,
                  background: "#111827",
                  color: "#ffffff",
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                Abrir relatÃ³rio
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}