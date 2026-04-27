"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";

type AthleteRow = {
  athlete_id: string;
  user_id: string | null;
  full_name: string | null;
  cpf: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  sex: string | null;
  gender: string | null;
  address_line: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  team: string | null;
  coach_name: string | null;
  sport_primary: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function pageStyle(): React.CSSProperties {
  return {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(20,184,166,.14), transparent 30%), radial-gradient(circle at top right, rgba(249,115,22,.12), transparent 28%), #f8fafc",
    color: "#0f172a",
    padding: 24,
    overflowX: "hidden",
  };
}

function cardStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: "rgba(255,255,255,.94)",
    border: "1px solid rgba(226,232,240,.92)",
    borderRadius: 28,
    padding: 22,
    boxShadow: "0 22px 60px rgba(15,23,42,.08)",
    backdropFilter: "blur(10px)",
    minWidth: 0,
    boxSizing: "border-box",
    ...extra,
  };
}

function miniLabelStyle(): React.CSSProperties {
  return {
    margin: 0,
    color: "#64748b",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  };
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function AdminAthletesPage() {
  const router = useRouter();

  const [athletes, setAthletes] = useState<AthleteRow[]>([]);
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    cpf: "",
    phone: "",
    birth_date: "",
    sex: "",
    gender: "",
    sport_primary: "",
    team: "",
    coach_name: "",
    address_city: "",
    address_state: "",
  });

  async function loadAthletes() {
    setLoading(true);
    setErr(null);

    try {
      const { data: auth } = await supabaseBrowser.auth.getUser();

      if (!auth.user) {
        router.push("/login");
        return;
      }

      const { data: profile, error: profileErr } = await supabaseBrowser
        .from("profiles")
        .select("role")
        .eq("user_id", auth.user.id)
        .single();

      if (profileErr || profile?.role !== "admin") {
        router.push("/login");
        return;
      }

      const { data, error } = await supabaseBrowser
        .from("athletes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setAthletes((data ?? []) as AthleteRow[]);
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao carregar atletas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAthletes();
  }, []);

  const filteredAthletes = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return athletes;

    return athletes.filter((a) => {
      const haystack = [
        a.full_name,
        a.email,
        a.cpf,
        a.phone,
        a.sport_primary,
        a.team,
        a.coach_name,
        a.address_city,
        a.address_state,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [athletes, query]);

  function updateForm(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function createAthlete(e: React.FormEvent) {
    e.preventDefault();

    setCreating(true);
    setErr(null);
    setMsg(null);

    try {
      if (!form.full_name.trim()) {
        throw new Error("Informe o nome completo do atleta.");
      }

      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim() || null,
        cpf: form.cpf.trim() || null,
        phone: form.phone.trim() || null,
        birth_date: form.birth_date || null,
        sex: form.sex.trim() || null,
        gender: form.gender.trim() || null,
        sport_primary: form.sport_primary.trim() || null,
        team: form.team.trim() || null,
        coach_name: form.coach_name.trim() || null,
        address_city: form.address_city.trim() || null,
        address_state: form.address_state.trim() || null,
      };

      const { error } = await supabaseBrowser.from("athletes").insert(payload);

      if (error) throw error;

      setMsg("Atleta cadastrado com sucesso.");
      setShowCreate(false);

      setForm({
        full_name: "",
        email: "",
        cpf: "",
        phone: "",
        birth_date: "",
        sex: "",
        gender: "",
        sport_primary: "",
        team: "",
        coach_name: "",
        address_city: "",
        address_state: "",
      });

      await loadAthletes();
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao cadastrar atleta.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="admin-page" style={pageStyle()}>
      <style>{`
        .admin-shell {
          width: min(100%, 1180px);
          margin: 0 auto;
          box-sizing: border-box;
        }

        .hero-title {
          margin: 8px 0 0;
          font-size: clamp(32px, 5vw, 44px);
          line-height: 1.03;
          letter-spacing: -1px;
          color: #fff;
        }

        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          margin-top: 16px;
        }

        .search-input {
          height: 44px;
          width: min(100%, 420px);
          border-radius: 14px;
          border: 1px solid #d1d5db;
          padding: 0 14px;
          font-size: 14px;
          font-family: inherit;
          background: #fff;
          color: #0f172a;
          outline: none;
        }

        .search-input:focus {
          border-color: #14b8a6;
          box-shadow: 0 0 0 4px rgba(20,184,166,.12);
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 16px;
        }

        .field {
          display: grid;
          gap: 7px;
        }

        .field-label {
          font-size: 12px;
          color: #475569;
          font-weight: 900;
        }

        .field-input {
          height: 44px;
          border-radius: 14px;
          border: 1px solid #d1d5db;
          padding: 0 12px;
          font-size: 14px;
          font-family: inherit;
          background: #fff;
          color: #0f172a;
          outline: none;
        }

        .table-wrap {
          overflow-x: auto;
          margin-top: 16px;
        }

        .athletes-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .athletes-table th {
          padding: 0 12px 12px 0;
          text-align: left;
          color: #64748b;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .35px;
          white-space: nowrap;
        }

        .athletes-table td {
          padding: 14px 12px 14px 0;
          border-top: 1px solid #e5e7eb;
          vertical-align: top;
        }
        .athlete-name-minimal {
          color: #0f172a;
          font-weight: 650;
          font-size: 16.5px;
          line-height: 1.35;
          letter-spacing: -0.1px;
        }

        .athlete-action-details {
          position: relative;
          width: 100%;
        }

        .athlete-action-details summary {
          list-style: none;
        }

        .athlete-action-details summary::-webkit-details-marker {
          display: none;
        }

        .athlete-name-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          width: 100%;
          min-height: 52px;
          padding: 0 14px;
          border-radius: 16px;
          border: 1px solid transparent;
          background: transparent;
          cursor: pointer;
          box-sizing: border-box;
        }

        .athlete-name-trigger:hover {
          border-color: #e5e7eb;
          background:
            radial-gradient(circle at top left, rgba(20,184,166,.07), transparent 34%),
            #ffffff;
        }

        .athlete-menu-hint {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid #e5e7eb;
          background: #f8fafc;
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .athlete-menu-hint::after {
          content: "›";
          margin-left: 7px;
          color: #94a3b8;
          font-size: 18px;
          line-height: 1;
        }

        .athlete-action-details[open] .athlete-name-trigger {
          border-color: #7dd3fc;
          background:
            radial-gradient(circle at top left, rgba(20,184,166,.10), transparent 35%),
            #eff6ff;
        }

        .athlete-action-details[open] .athlete-menu-hint {
          border-color: #7dd3fc;
          background: #ecfeff;
          color: #075985;
        }

        .athlete-action-details[open] .athlete-menu-hint::after {
          content: "⌄";
          font-size: 14px;
        }

        .athlete-dropdown-menu {
          display: grid;
          grid-template-columns: repeat(4, minmax(104px, 1fr));
          gap: 8px;
          margin: 8px 14px 4px;
          padding: 12px;
          border-radius: 18px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          box-shadow: 0 18px 42px rgba(15,23,42,.08);
        }@media (max-width: 860px) {
          .form-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .athlete-dropdown-menu {
            grid-template-columns: repeat(2, minmax(112px, 1fr));
          }
        }

        @media (max-width: 560px) {
          .admin-page {
            padding: 12px !important;
          }

          .hero-card {
            padding: 22px 18px !important;
            border-radius: 26px !important;
          }

          .content-card {
            padding: 18px !important;
            border-radius: 24px !important;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .toolbar {
            align-items: stretch;
          }

          .search-input {
            width: 100%;
          }
        }
      `}</style>

      <div className="admin-shell">
        <section
          className="hero-card"
          style={cardStyle({
            padding: 28,
            background:
              "linear-gradient(135deg, rgba(15,23,42,.97), rgba(30,41,59,.95))",
            color: "#fff",
            overflow: "hidden",
            position: "relative",
          })}
        >
          <div
            style={{
              position: "absolute",
              right: -80,
              top: -80,
              width: 260,
              height: 260,
              borderRadius: 999,
              background: "rgba(20,184,166,.22)",
            }}
          />

          <div
            style={{
              position: "absolute",
              right: 120,
              bottom: -110,
              width: 260,
              height: 260,
              borderRadius: 999,
              background: "rgba(249,115,22,.18)",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            <p
              style={{
                margin: 0,
                color: "#99f6e4",
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: 0.6,
                textTransform: "uppercase",
              }}
            >
              Administração ENDURE
            </p>

            <h1 className="hero-title">Atletas</h1>

            <p style={{ margin: "12px 0 0", maxWidth: 780, color: "#cbd5e1", lineHeight: 1.65 }}>
              Gerencie atletas cadastrados, acompanhe perfis, avaliações designadas e dashboards individuais.
            </p>
          </div>
        </section>

        {err ? (
          <section
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 18,
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#991b1b",
              fontWeight: 800,
            }}
          >
            {err}
          </section>
        ) : null}

        {msg ? (
          <section
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 18,
              border: "1px solid #bbf7d0",
              background: "#f0fdf4",
              color: "#166534",
              fontWeight: 800,
            }}
          >
            {msg}
          </section>
        ) : null}

        <section className="content-card" style={{ ...cardStyle(), marginTop: 16 }}>
          <div className="toolbar">
            <div>
              <p style={miniLabelStyle()}>Cadastro e acompanhamento</p>

              <h2 style={{ margin: "6px 0 0", fontSize: 24, letterSpacing: -0.5 }}>
                Lista de atletas
              </h2>

              <p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.55 }}>
                {loading
                  ? "Carregando atletas..."
                  : `${filteredAthletes.length} de ${athletes.length} atleta${athletes.length === 1 ? "" : "s"} exibido${filteredAthletes.length === 1 ? "" : "s"}.`}
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <input
                className="search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome, email, equipe..."
              />

              <button
                type="button"
                onClick={() => setShowCreate((v) => !v)}
                style={primaryButtonStyle()}
              >
                {showCreate ? "Fechar cadastro" : "Cadastrar atleta"}
              </button>
            </div>
          </div>

          {showCreate ? (
            <form onSubmit={createAthlete} style={{ marginTop: 18 }}>
              <div
                style={{
                  padding: 16,
                  borderRadius: 22,
                  border: "1px solid #e5e7eb",
                  background: "#f8fafc",
                }}
              >
                <div style={{ fontWeight: 950, fontSize: 18 }}>
                  Novo atleta
                </div>

                <div className="form-grid">
                  <Field label="Nome completo" required value={form.full_name} onChange={(v) => updateForm("full_name", v)} />
                  <Field label="Email" value={form.email} onChange={(v) => updateForm("email", v)} />
                  <Field label="CPF" value={form.cpf} onChange={(v) => updateForm("cpf", v)} />
                  <Field label="Telefone" value={form.phone} onChange={(v) => updateForm("phone", v)} />
                  <Field label="Nascimento" type="date" value={form.birth_date} onChange={(v) => updateForm("birth_date", v)} />
                  <Field label="Sexo" value={form.sex} onChange={(v) => updateForm("sex", v)} />
                  <Field label="Gênero" value={form.gender} onChange={(v) => updateForm("gender", v)} />
                  <Field label="Esporte principal" value={form.sport_primary} onChange={(v) => updateForm("sport_primary", v)} />
                  <Field label="Equipe" value={form.team} onChange={(v) => updateForm("team", v)} />
                  <Field label="Treinador" value={form.coach_name} onChange={(v) => updateForm("coach_name", v)} />
                  <Field label="Cidade" value={form.address_city} onChange={(v) => updateForm("address_city", v)} />
                  <Field label="UF" value={form.address_state} onChange={(v) => updateForm("address_state", v)} />
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                  <button
                    type="submit"
                    disabled={creating}
                    style={primaryButtonStyle(creating)}
                  >
                    {creating ? "Cadastrando..." : "Salvar atleta"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    style={secondaryButtonStyle()}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </form>
          ) : null}

          <div className="table-wrap">
            {filteredAthletes.length === 0 ? (
              <EmptyBox text={loading ? "Carregando atletas..." : "Nenhum atleta encontrado."} />
            ) : (
              <table className="athletes-table">
                <thead>
                  <tr>
                    <th>Atleta</th>


                  </tr>
                </thead>

                <tbody>
                  {filteredAthletes.map((a) => (
                    <tr key={a.athlete_id}>
                      <td>
                        <details className="athlete-action-details">
                          <summary className="athlete-name-trigger">
                            <span className="athlete-name-minimal">
                              {a.full_name ?? "Atleta"}
                            </span>

                            <span className="athlete-menu-hint">
                              Ações
                            </span>
                          </summary>

                          <div className="athlete-dropdown-menu">
                            <LinkButton href={`/admin/athletes/${a.athlete_id}/profile`}>
                              Perfil
                            </LinkButton>

                            <LinkButton href={`/admin/athletes/${a.athlete_id}/dashboard`}>
                              Dashboard
                            </LinkButton>

                            <LinkButton href={`/admin/athletes/${a.athlete_id}/assigned`}>
                              Avaliações
                            </LinkButton>

                            <LinkButton href="/admin/assign/evaluation">
                              Designar
                            </LinkButton>
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required ? " *" : ""}
      </span>

      <input
        className="field-input"
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function LinkButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} style={secondaryButtonStyle()}>
      {children}
    </Link>
  );
}

function primaryButtonStyle(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "0 16px",
    borderRadius: 14,
    border: disabled ? "1px solid #e5e7eb" : "1px solid #111827",
    background: disabled ? "#f8fafc" : "#111827",
    color: disabled ? "#94a3b8" : "#ffffff",
    fontSize: 14,
    fontWeight: 900,
    fontFamily: "inherit",
    textDecoration: "none",
    whiteSpace: "nowrap",
    cursor: disabled ? "not-allowed" : "pointer",
    boxSizing: "border-box",
  };
}

function secondaryButtonStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    width: "100%",
    padding: "0 12px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    fontSize: 13,
    fontWeight: 850,
    fontFamily: "inherit",
    textDecoration: "none",
    whiteSpace: "nowrap",
    cursor: "pointer",
    boxSizing: "border-box",
  };
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 18,
        border: "1px dashed #cbd5e1",
        background: "#f8fafc",
        color: "#64748b",
        fontWeight: 700,
      }}
    >
      {text}
    </div>
  );
}