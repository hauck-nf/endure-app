import Link from "next/link";
import { requireAdmin } from "@/src/lib/requireAdmin";
import CreateAthleteForm from "./CreateAthleteForm";

function sectionStyle(): React.CSSProperties {
  return {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 24,
    padding: 22,
    boxShadow: "0 18px 48px rgba(15,23,42,.06)",
  };
}

function actionLinkStyle(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    width: "100%",
    padding: "0 10px",
    borderRadius: 12,
    border: primary ? "1px solid #0f172a" : "1px solid #d1d5db",
    background: primary ? "#0f172a" : "#ffffff",
    color: primary ? "#ffffff" : "#0f172a",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 13,
    lineHeight: 1,
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  };
}

export default async function AdminAthletesPage() {
  const { supabase } = await requireAdmin();

  const { data: athletes, error } = await supabase
    .from("athletes")
    .select("athlete_id, full_name, email")
    .order("full_name", { ascending: true })
    .limit(1000);

  const athleteRows = athletes ?? [];

  return (
    <div
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: "20px 16px 32px",
        display: "grid",
        gap: 16,
      }}
    >
      <section
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 100%)",
          border: "1px solid #e5e7eb",
          borderRadius: 24,
          padding: 22,
          boxShadow: "0 18px 48px rgba(15,23,42,.06)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            border: "1px solid #dbeafe",
            background: "#eff6ff",
            color: "#1d4ed8",
            borderRadius: 999,
            padding: "8px 12px",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.2,
          }}
        >
          Administração de atletas
        </div>

        <h1
          style={{
            margin: "14px 0 10px",
            fontSize: 32,
            lineHeight: 1.1,
            letterSpacing: -0.6,
            color: "#0f172a",
            fontWeight: 700,
          }}
        >
          Atletas
        </h1>

        <p
          style={{
            margin: 0,
            color: "#64748b",
            lineHeight: 1.75,
            fontSize: 15,
            maxWidth: 760,
          }}
        >
          Consulte os cadastros e acesse rapidamente o dashboard do atleta, suas
          avaliações designadas e os dados cadastrais.
        </p>

        <div
          style={{
            marginTop: 16,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 999,
            padding: "8px 12px",
            background: "#f8fafc",
            border: "1px solid #e5e7eb",
            color: "#475569",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {athleteRows.length} atleta(s)
        </div>
      </section>

      {error ? (
        <div
          style={{
            border: "1px solid #fecaca",
            background: "#fff1f2",
            color: "#9f1239",
            borderRadius: 18,
            padding: 16,
            lineHeight: 1.7,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            Erro ao carregar atletas
          </div>
          <div style={{ fontSize: 14 }}>{error.message}</div>
        </div>
      ) : null}

      <section
        data-admin-athletes-grid="true"
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "minmax(0, 1fr)",
        }}
      >
        <div style={sectionStyle()}>
          <h2
            style={{
              margin: 0,
              fontSize: 24,
              lineHeight: 1.15,
              color: "#0f172a",
              fontWeight: 700,
            }}
          >
            Lista de atletas
          </h2>

          <p
            style={{
              marginTop: 8,
              marginBottom: 16,
              color: "#64748b",
              fontSize: 14,
              lineHeight: 1.75,
            }}
          >
            Selecione a área que deseja acessar para cada atleta.
          </p>

          {athleteRows.length === 0 ? (
            <div
              style={{
                border: "1px dashed #d1d5db",
                borderRadius: 18,
                padding: 20,
                color: "#64748b",
                background: "#fcfcfd",
              }}
            >
              Nenhum atleta encontrado.
            </div>
          ) : (
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 18,
                overflow: "hidden",
                background: "#ffffff",
              }}
            >
              {athleteRows.map((a, index) => (
                <div
                  key={a.athlete_id}
                  className="athlete-row"
                  style={{
                    display: "grid",
                    gap: 12,
                    padding: "14px 18px",
                    borderTop: index === 0 ? "none" : "1px solid #f1f5f9",
                    background: "#ffffff",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gap: 2,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: "#0f172a",
                        lineHeight: 1.35,
                      }}
                    >
                      {a.full_name ?? "Atleta sem nome"}
                    </div>

                    <div
                      style={{
                        color: "#64748b",
                        fontSize: 14,
                        lineHeight: 1.6,
                        wordBreak: "break-word",
                      }}
                    >
                      {a.email ?? "Sem email cadastrado"}
                    </div>
                  </div>

                  <div
                    className="athlete-actions"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: 8,
                    }}
                  >
                    <Link
                      href={`/admin/athletes/${a.athlete_id}/dashboard`}
                      style={actionLinkStyle(true)}
                    >
                      Dashboard
                    </Link>

                    <Link
                      href={`/admin/athletes/${a.athlete_id}/assigned`}
                      style={actionLinkStyle(false)}
                    >
                      Avaliações
                    </Link>

                    <Link
                      href={`/admin/athletes/${a.athlete_id}/profile`}
                      style={actionLinkStyle(false)}
                    >
                      Dados
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={sectionStyle()}>
          <h2
            style={{
              margin: 0,
              fontSize: 24,
              lineHeight: 1.15,
              color: "#0f172a",
              fontWeight: 700,
            }}
          >
            Cadastrar atleta
          </h2>

          <p
            style={{
              marginTop: 8,
              marginBottom: 16,
              color: "#64748b",
              fontSize: 14,
              lineHeight: 1.75,
            }}
          >
            Crie um novo cadastro para disponibilizar avaliações e relatórios na
            plataforma.
          </p>

          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <CreateAthleteForm />
          </div>
        </div>
      </section>

      <style>{`
        @media (min-width: 1024px) {
          section[data-admin-athletes-grid="true"] {
            grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
            align-items: start;
          }
        }

        @media (min-width: 720px) {
          .athlete-row {
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: center;
          }

          .athlete-actions {
            min-width: 360px;
          }
        }
      `}</style>
    </div>
  );
}