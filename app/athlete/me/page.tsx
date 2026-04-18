"use client";

import { useEffect, useMemo, useState } from "react";

type Athlete = {
  athlete_id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  sex: string | null;
  gender: string | null;
  team: string | null;
  coach_name: string | null;
  sport_primary: string | null;
  address_city: string | null;
  address_state: string | null;
};

function Field({ label, value, disabled, onChange, placeholder }: any) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{label}</div>
      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        style={{
          height: 44,
          padding: "0 12px",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          background: disabled ? "#f9fafb" : "#fff",
          outline: "none",
        }}
      />
    </label>
  );
}

export default function AthleteMePage() {
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [form, setForm] = useState<any>({});
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/athlete/me");
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok || !json?.ok) {
      setMsg(`Erro ao carregar: ${json?.error ?? `HTTP ${res.status}`}`);
      return;
    }
    setAthlete(json.athlete);
    setForm(json.athlete ?? {});
  }

  useEffect(() => { load(); }, []);

  const headerRight = useMemo(() => {
    if (!athlete) return null;
    return (
      <div style={{ display: "flex", gap: 8 }}>
        {!editing ? (
          <button
            onClick={() => { setEditing(true); setMsg(""); }}
            style={{ height: 40, padding: "0 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", fontWeight: 900 }}
          >
            Editar
          </button>
        ) : (
          <>
            <button
              onClick={() => { setEditing(false); setForm(athlete); setMsg(""); }}
              style={{ height: 40, padding: "0 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", fontWeight: 800 }}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              onClick={async () => {
                setSaving(true);
                setMsg("");
                const res = await fetch("/api/athlete/me", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(form),
                });
                const json = await res.json().catch(() => ({}));
                setSaving(false);
                if (!res.ok || !json?.ok) {
                  setMsg(`Erro ao salvar: ${json?.error ?? `HTTP ${res.status}`}`);
                  return;
                }
                setAthlete(json.athlete);
                setForm(json.athlete);
                setEditing(false);
                setMsg("Dados atualizados com sucesso.");
              }}
              style={{ height: 40, padding: "0 12px", borderRadius: 12, border: "1px solid #111827", background: "#111827", color: "#fff", fontWeight: 900 }}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </>
        )}
      </div>
    );
  }, [editing, athlete, form, saving]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>Meus dados</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Atualize seus dados cadastrais</div>
        </div>
        {headerRight}
      </div>

      {loading ? (
        <div style={{ padding: 12, color: "#6b7280" }}>Carregando...</div>
      ) : null}

      {msg ? (
        <div style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 14, padding: 12, fontSize: 13 }}>
          {msg}
        </div>
      ) : null}

      {athlete ? (
        <div style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 16, boxShadow: "0 14px 40px rgba(17,24,39,.06)", padding: 14 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Nome completo" value={form.full_name} disabled={!editing} onChange={(v: string) => setForm({ ...form, full_name: v })} />
              <Field label="Email" value={athlete.email ?? ""} disabled={true} onChange={() => {}} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Telefone" value={form.phone} disabled={!editing} onChange={(v: string) => setForm({ ...form, phone: v })} />
              <Field label="Data de nascimento (YYYY-MM-DD)" value={form.birth_date} disabled={!editing} onChange={(v: string) => setForm({ ...form, birth_date: v })} placeholder="1990-01-31" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Sexo" value={form.sex} disabled={!editing} onChange={(v: string) => setForm({ ...form, sex: v })} />
              <Field label="Gênero" value={form.gender} disabled={!editing} onChange={(v: string) => setForm({ ...form, gender: v })} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Equipe" value={form.team} disabled={!editing} onChange={(v: string) => setForm({ ...form, team: v })} />
              <Field label="Treinador(a)" value={form.coach_name} disabled={!editing} onChange={(v: string) => setForm({ ...form, coach_name: v })} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Modalidade principal" value={form.sport_primary} disabled={!editing} onChange={(v: string) => setForm({ ...form, sport_primary: v })} />
              <Field label="Cidade" value={form.address_city} disabled={!editing} onChange={(v: string) => setForm({ ...form, address_city: v })} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Estado" value={form.address_state} disabled={!editing} onChange={(v: string) => setForm({ ...form, address_state: v })} />
              <div />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}