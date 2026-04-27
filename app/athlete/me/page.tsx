import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabaseServer";

export const dynamic = "force-dynamic";

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

function valueOrDash(value?: string | null) {
  const v = String(value ?? "").trim();
  return v || "—";
}

function locationLine(a: AthleteRow) {
  const city = String(a.address_city ?? "").trim();
  const state = String(a.address_state ?? "").trim();

  if (city && state) return `${city} / ${state}`;
  if (city) return city;
  if (state) return state;

  return "—";
}

export default async function AthleteMePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/athlete/me");

  const { data: athlete, error } = await supabase
    .from("athletes")
    .select(
      "athlete_id, user_id, full_name, cpf, email, phone, birth_date, sex, gender, address_line, address_city, address_state, address_zip, team, coach_name, sport_primary, created_at, updated_at"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const a = athlete as AthleteRow | null;

  return (
    <main className="athlete-me-page">
      <style>{`
        .athlete-me-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(20,184,166,.14), transparent 30%),
            radial-gradient(circle at top right, rgba(249,115,22,.12), transparent 28%),
            #f8fafc;
          color: #0f172a;
          padding: 24px;
          overflow-x: hidden;
        }

        .athlete-me-shell {
          width: min(100%, 1180px);
          margin: 0 auto;
          box-sizing: border-box;
        }

        .hero-title {
          margin: 8px 0 0;
          font-size: clamp(32px, 5vw, 44px);
          line-height: 1.03;
          letter-spacing: -1px;
          color: #ffffff;
        }

        .profile-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr);
          gap: 16px;
          margin-top: 16px;
          align-items: start;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 16px;
        }

        .info-item {
          min-width: 0;
          padding: 14px;
          border-radius: 18px;
          border: 1px solid #e5e7eb;
          background:
            radial-gradient(circle at top left, rgba(20,184,166,.07), transparent 34%),
            #ffffff;
        }

        .info-label {
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .35px;
          text-transform: uppercase;
        }

        .info-value {
          margin-top: 6px;
          color: #0f172a;
          font-size: 15.5px;
          font-weight: 750;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }

        .main-name {
          margin: 0;
          color: #0f172a;
          font-size: clamp(26px, 4vw, 34px);
          line-height: 1.05;
          letter-spacing: -0.8px;
          font-weight: 950;
        }

        .subtle-text {
          color: #64748b;
          line-height: 1.65;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          padding: 0 11px;
          border-radius: 999px;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #065f46;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        @media (max-width: 860px) {
          .profile-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 620px) {
          .info-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .athlete-me-page {
            padding: 12px;
          }

          .hero-card {
            padding: 22px 18px !important;
            border-radius: 26px !important;
          }

          .content-card {
            padding: 18px !important;
            border-radius: 24px !important;
          }
        }
      `}</style>

      <div className="athlete-me-shell">
        <section
          className="hero-card"
          style={cardStyle({
            padding: 28,
            background:
              "linear-gradient(135deg, rgba(15,23,42,.97), rgba(30,41,59,.95))",
            color: "#ffffff",
            overflow: "hidden",
            position: "relative",
          })}
        >
          <HeroDecor />

          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              justifyContent: "space-between",
              gap: 18,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div>
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
                Área do atleta
              </p>

              <h1 className="hero-title">Meus dados</h1>

              <p
                style={{
                  margin: "12px 0 0",
                  maxWidth: 780,
                  color: "#cbd5e1",
                  lineHeight: 1.65,
                }}
              >
                Consulte as informações associadas ao seu cadastro de atleta na plataforma ENDURE.
              </p>
            </div>

            <div
              style={{
                minHeight: 44,
                padding: "0 14px",
                borderRadius: 14,
                border: "1px solid rgba(153,246,228,.30)",
                background: "rgba(15,23,42,.32)",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                fontWeight: 900,
              }}
            >
              Perfil do atleta
            </div>
          </div>
        </section>

        {error || !a ? (
          <section style={{ ...cardStyle(), marginTop: 16 }} className="content-card">
            <p style={miniLabelStyle()}>Cadastro não localizado</p>

            <h2 style={{ margin: "6px 0 0", fontSize: 24 }}>
              Não encontramos seu perfil de atleta
            </h2>

            <p className="subtle-text" style={{ margin: "8px 0 0" }}>
              Sua conta está autenticada, mas ainda não há um cadastro de atleta vinculado a este usuário.
            </p>

            <div
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 16,
                border: "1px solid #e5e7eb",
                background: "#f8fafc",
                color: "#475569",
                fontSize: 13,
                fontWeight: 700,
                overflowWrap: "anywhere",
              }}
            >
              user_id: {user.id}
            </div>
          </section>
        ) : (
          <>
            <section className="profile-grid">
              <section style={cardStyle()} className="content-card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 14,
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <p style={miniLabelStyle()}>Identificação</p>

                    <h2 className="main-name">
                      {valueOrDash(a.full_name)}
                    </h2>

                    <p className="subtle-text" style={{ margin: "10px 0 0" }}>
                      Dados básicos do cadastro utilizado para vincular avaliações, relatórios e histórico.
                    </p>
                  </div>

                  <span className="status-pill">Cadastro ativo</span>
                </div>

                <div className="info-grid">
                  <InfoItem label="Nome completo" value={valueOrDash(a.full_name)} />
                  <InfoItem label="CPF" value={valueOrDash(a.cpf)} />
                  <InfoItem label="E-mail" value={valueOrDash(a.email)} />
                  <InfoItem label="Telefone" value={valueOrDash(a.phone)} />
                  <InfoItem label="Nascimento" value={formatDate(a.birth_date)} />
                  <InfoItem label="Sexo" value={valueOrDash(a.sex)} />
                  <InfoItem label="Gênero" value={valueOrDash(a.gender)} />
                  <InfoItem label="Localidade" value={locationLine(a)} />
                </div>
              </section>

              <section style={cardStyle()} className="content-card">
                <p style={miniLabelStyle()}>Contexto esportivo</p>

                <h2
                  style={{
                    margin: "6px 0 0",
                    fontSize: 24,
                    lineHeight: 1.08,
                    letterSpacing: -0.5,
                  }}
                >
                  Esporte e equipe
                </h2>

                <p className="subtle-text" style={{ margin: "8px 0 0" }}>
                  Informações usadas para contextualizar avaliações e acompanhamento longitudinal.
                </p>

                <div className="info-grid">
                  <InfoItem label="Esporte principal" value={valueOrDash(a.sport_primary)} />
                  <InfoItem label="Equipe" value={valueOrDash(a.team)} />
                  <InfoItem label="Treinador(a)" value={valueOrDash(a.coach_name)} />
                  <InfoItem label="Endereço" value={valueOrDash(a.address_line)} />
                  <InfoItem label="CEP" value={valueOrDash(a.address_zip)} />
                  <InfoItem label="Atualizado em" value={formatDate(a.updated_at)} />
                </div>
              </section>
            </section>

            <section style={{ ...cardStyle(), marginTop: 16 }} className="content-card">
              <p style={miniLabelStyle()}>Conta</p>

              <h2
                style={{
                  margin: "6px 0 0",
                  fontSize: 24,
                  lineHeight: 1.08,
                  letterSpacing: -0.5,
                }}
              >
                Vínculo de acesso
              </h2>

              <p className="subtle-text" style={{ margin: "8px 0 0" }}>
                Estes identificadores ajudam a equipe administrativa a conferir o vínculo entre sua conta de acesso e o cadastro de atleta.
              </p>

              <div className="info-grid">
                <InfoItem label="Athlete ID" value={a.athlete_id} />
                <InfoItem label="User ID" value={a.user_id ?? user.id} />
                <InfoItem label="Criado em" value={formatDate(a.created_at)} />
                <InfoItem label="Atualizado em" value={formatDate(a.updated_at)} />
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function HeroDecor() {
  return (
    <>
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
    </>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-item">
      <div className="info-label">{label}</div>
      <div className="info-value">{value}</div>
    </div>
  );
}