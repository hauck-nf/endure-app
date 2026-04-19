import Link from "next/link";

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 24,
  padding: 20,
  boxShadow: "0 18px 48px rgba(15,23,42,.06)",
};

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(59,130,246,.08), transparent 28%), radial-gradient(circle at bottom right, rgba(15,23,42,.06), transparent 28%), linear-gradient(180deg, #f8fafc 0%, #eef2ff 48%, #f8fafc 100%)",
        color: "#0f172a",
      }}
    >
      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "28px 18px 72px",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 16,
                border: "1px solid #e5e7eb",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,.96) 0%, rgba(241,245,249,.96) 100%)",
                boxShadow: "0 12px 30px rgba(15,23,42,.08)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <img
                src="/endure_logo.png"
                alt="ENDURE"
                style={{ width: 26, height: 26, objectFit: "contain" }}
              />
            </div>

            <div>
              <div
                style={{
                  fontWeight: 900,
                  letterSpacing: 0.8,
                  color: "#0f172a",
                }}
              >
                ENDURE
              </div>
              <div style={{ fontSize: 13, color: "#64748b" }}>
                Avaliação socioemocional em atletas
              </div>
            </div>
          </div>

          <Link
            href="/login"
            style={{
              height: 44,
              padding: "0 18px",
              borderRadius: 14,
              border: "1px solid #0f172a",
              background: "#0f172a",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              textDecoration: "none",
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            Entrar
          </Link>
        </header>

        <section
          style={{
            display: "grid",
            gap: 22,
            marginTop: 30,
          }}
        >
          <div
            style={{
              ...cardStyle,
              padding: 22,
              background:
                "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 100%)",
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
                fontWeight: 800,
                letterSpacing: 0.3,
              }}
            >
              Plataforma para atletas e equipe técnica
            </div>

            <h1
              style={{
                margin: "16px 0 12px",
                fontSize: "clamp(2.1rem, 7vw, 4.4rem)",
                lineHeight: 1.03,
                letterSpacing: -1.4,
                color: "#0f172a",
                maxWidth: 880,
              }}
            >
              Avaliação socioemocional com rigor científico e aplicação prática.
            </h1>

            <p
              style={{
                margin: 0,
                color: "#475569",
                fontSize: 17,
                lineHeight: 1.8,
                maxWidth: 760,
              }}
            >
              A ENDURE é uma bateria de avaliação construída para identificar potencialidades 
              socioemocionais a serem desenvolvidas para 
              otimizar o desempenho em atletas de endurance. 
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                marginTop: 22,
              }}
            >
              <Link
                href="/login"
                style={{
                  height: 48,
                  padding: "0 20px",
                  borderRadius: 14,
                  border: "1px solid #0f172a",
                  background: "#0f172a",
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  textDecoration: "none",
                  fontWeight: 800,
                }}
              >
                Acessar plataforma
              </Link>

              <a
                href="#beneficios"
                style={{
                  height: 48,
                  padding: "0 20px",
                  borderRadius: 14,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  color: "#0f172a",
                  display: "inline-flex",
                  alignItems: "center",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Ver benefícios
              </a>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 16,
            }}
          >
            <div style={cardStyle}>
              <div style={{ fontSize: 13, color: "#64748b" }}>Rigor psicométrico</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 900,
                  fontSize: 22,
                  color: "#0f172a",
                }}
              >
                Construída com base em princípios psicométricos sólidos, mas, fácil de usar e entender.
              </div>
              <p
                style={{
                  margin: "10px 0 0",
                  color: "#64748b",
                  lineHeight: 1.7,
                }}
              >
                Métricas e indicadores para aprimoramento de atletas de endurance.
              </p>
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: 13, color: "#64748b" }}>Aplicação prática</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 900,
                  fontSize: 22,
                  color: "#0f172a",
                }}
              >
                Ambiente intuitivo para autoavaliação e automonitoramento,
                para o atleta
              </div>
              <p
                style={{
                  margin: "10px 0 0",
                  color: "#64748b",
                  lineHeight: 1.7,
                }}
              >
                Relatórios de avaliação fáceis de entender, reunidos em
                um fluxo simples, informativo e intuitivo para o uso diário.
              </p>
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: 13, color: "#64748b" }}>Leitura estruturada</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 900,
                  fontSize: 22,
                  color: "#0f172a",
                }}
              >
                Informação estratégica para atletas, equipe técnica e pesquisa
              </div>
              <p
                style={{
                  margin: "10px 0 0",
                  color: "#64748b",
                  lineHeight: 1.7,
                }}
              >
                É a ponte entre a 
              pesquisa científica e as competições.
              </p>
            </div>
          </div>
        </section>

        <section id="beneficios" style={{ marginTop: 34, display: "grid", gap: 16 }}>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: "#2563eb",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Benefícios
            </div>
            <h2
              style={{
                margin: "10px 0 8px",
                fontSize: "clamp(1.8rem, 5vw, 2.4rem)",
                color: "#0f172a",
              }}
            >
              Autoavaliativa, você mesmo responde aos instrumentos e obtém relatórios
            </h2>
            <p
              style={{
                margin: 0,
                color: "#64748b",
                lineHeight: 1.8,
                maxWidth: 760,
              }}
            >
              Fácil e intuitva de usar, tanto no desktop quanto no smartphone.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: 16,
            }}
          >
            {[
              {
                title: "Acompanhamento longitudinal",
                text: "Visualize evolução ao longo do tempo em um ambiente organizado.",
              },
              {
                title: "Relatórios estruturados",
                text: "Transforme dados em leitura técnica mais rápida e útil.",
              },
              {
                title: "Fluxo intuitivo",
                text: "Pendências, respostas e histórico em uma navegação simples.",
              },
            ].map((item) => (
              <div key={item.title} style={cardStyle}>
                <div style={{ fontWeight: 900, fontSize: 18, color: "#0f172a" }}>
                  {item.title}
                </div>
                <p
                  style={{
                    margin: "10px 0 0",
                    color: "#64748b",
                    lineHeight: 1.7,
                  }}
                >
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}