"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";

type AthleteRow = {
  full_name: string | null;
  sex: string | null;
  gender: string | null;
  birth_date: string | null;
  cpf: string | null;
  email: string | null;
  phone: string | null;
  sport_primary: string | null;
  team: string | null;
  coach_name: string | null;
  address_city: string | null;
  address_state: string | null;
};

function isUuid(x: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
}

function inputStyle(): React.CSSProperties {
  return { padding: 10, borderRadius: 10, border: "1px solid #e5e7eb", width: "100%" };
}

export default function AthleteProfilePageClient() {
  const params = useParams();
  const router = useRouter();
  const athleteId = String((params as any)?.athlete_id ?? "").trim();

  const [row, setRow] = useState<AthleteRow | null>(null);
  const [draft, setDraft] = useState<AthleteRow | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        setLoading(true);

        if (!athleteId || athleteId === "undefined" || !isUuid(athleteId)) {
          setErr(`athlete_id inválido: ${athleteId || "(vazio)"}`);
          return;
        }

        const { data: auth } = await supabaseBrowser.auth.getUser();
        if (!auth.user) {
          router.push("/login");
          return;
        }

        const { data: profile, error: pErr } = await supabaseBrowser
          .from("profiles")
          .select("role")
          .eq("user_id", auth.user.id)
          .single();

        if (pErr || profile?.role !== "admin") {
          router.push("/login");
          return;
        }

        const { data: a, error: aErr } = await supabaseBrowser
          .from("athletes")
          .select("full_name, sex, gender, birth_date, cpf, email, phone, sport_primary, team, coach_name, address_city, address_state")
          .eq("athlete_id", athleteId)
          .single();

        if (aErr) throw aErr;

        setRow(a as any);
        setDraft(a as any);
      } catch (e: any) {
        setErr(e?.message ?? "Erro ao carregar dados cadastrais.");
      } finally {
        setLoading(false);
      }
    })();
  }, [athleteId, router]);

  const fields = useMemo(() => {
    const r = row ?? ({} as AthleteRow);
    const d = draft ?? ({} as AthleteRow);

    return [
      { key: "full_name", label: "Nome completo", value: r.full_name, draftValue: d.full_name },
      { key: "sex", label: "Sexo", value: r.sex, draftValue: d.sex },
      { key: "gender", label: "Gênero", value: r.gender, draftValue: d.gender },
      { key: "birth_date", label: "Data de nascimento", value: r.birth_date, draftValue: d.birth_date, placeholder: "YYYY-MM-DD" },
      { key: "cpf", label: "CPF", value: r.cpf, draftValue: d.cpf },
      { key: "email", label: "E-mail", value: r.email, draftValue: d.email },
      { key: "phone", label: "Telefone", value: r.phone, draftValue: d.phone },
      { key: "sport_primary", label: "Esporte", value: r.sport_primary, draftValue: d.sport_primary },
      { key: "team", label: "Equipe", value: r.team, draftValue: d.team },
      { key: "coach_name", label: "Coach", value: r.coach_name, draftValue: d.coach_name },
      { key: "address_city", label: "Cidade", value: r.address_city, draftValue: d.address_city },
      { key: "address_state", label: "Estado", value: r.address_state, draftValue: d.address_state },
    ] as const;
  }, [row, draft]);

  function setDraftField(key: keyof AthleteRow, value: string) {
    setDraft((prev) => ({ ...(prev ?? ({} as AthleteRow)), [key]: value || null }));
  }

  function startEdit() {
    setMsg(null);
    setErr(null);
    setDraft(row);
    setEditing(true);
  }

  function cancelEdit() {
    setMsg(null);
    setErr(null);
    setDraft(row);
    setEditing(false);
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setMsg(null);
    setErr(null);

    try {
      const payload: Partial<AthleteRow> = { ...draft };
      if (payload.birth_date && String(payload.birth_date).trim() === "") payload.birth_date = null;

      const { error } = await supabaseBrowser
        .from("athletes")
        .update(payload)
        .eq("athlete_id", athleteId);

      if (error) throw error;

      setRow(draft);
      setEditing(false);
      setMsg("Dados atualizados.");
      setTimeout(() => setMsg(null), 1200);
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: 16, color: "#6b7280" }}>Carregando…</div>;

  if (err) {
    return (
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Erro</h1>
        <div style={{ color: "#6b7280", marginTop: 6 }}>{err}</div>
        <div style={{ marginTop: 12 }}>
          <a href="/admin/athletes">← Voltar</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Dados cadastrais</h1>

        {!editing ? (
          <button
            type="button"
            onClick={startEdit}
            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", fontWeight: 700, cursor: "pointer" }}
          >
            Editar
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", fontWeight: 700, cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #111827", background: "#111827", color: "#fff", fontWeight: 800, cursor: "pointer" }}
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        )}
      </div>

      {msg ? <div style={{ color: "#065f46", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 12, padding: 10 }}>{msg}</div> : null}

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {fields.map((f) => (
              <tr key={f.key}>
                <td style={{ padding: "12px 12px", borderBottom: "1px solid #f3f4f6", width: 240, color: "#6b7280" }}>
                  {f.label}
                </td>
                <td style={{ padding: "12px 12px", borderBottom: "1px solid #f3f4f6" }}>
                  {!editing ? (
                    f.value ?? "—"
                  ) : (
                    <input
                      value={(f.draftValue ?? "") as any}
                      placeholder={(f as any).placeholder ?? ""}
                      onChange={(e) => setDraftField(f.key as keyof AthleteRow, e.target.value)}
                      style={inputStyle()}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 8 }}>
        <a href="/admin/athletes">← Voltar</a>
      </div>
    </div>
  );
}
