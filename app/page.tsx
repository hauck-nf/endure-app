import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #f8fafc 0%, #eef2ff 45%, #f8fafc 100%)",
        color: "#0f172a",
      }}
    >
      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "56px 20px 80px",
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
            <img
              src="/endure_logo.png"
              alt="ENDURE"
              style={{ width: 36, height: 36, objectFit: "contain" }}
            />
            <div>
              <div style={{ fontWeight: 900, letterSpacing: 0.8 }}>ENDURE</div>
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
            }}
          >
            Entrar
          </Link>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: 24,
            marginTop: 48,
            alignItems: "center",
          }}
        >
          <div>
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
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              Plataforma para atletas e equipe técnica
            </div>

            <h1
              style={{
                margin: "18px 0 14px",
                fontSize: "clamp(2.2rem, 5vw, 4rem)",
                lineHeight: 1.05,
                letterSpacing: -1.4,
              }}
            >
              Avaliação socioemocional com rigor científico e aplicação prática.
            </h1>

            <p
              style={{
                fontSize: 18,
                lineHeight: 1.7,
                color: "#475569",
                maxWidth: 760,
                margin: 0,
              }}
            >
              A ENDURE organiza avaliações, histórico e relatórios em um ambiente
              pensado para monitoramento, pesquisa e desenvolvimento humano no
              contexto esportivo.
            </p>

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginTop: 24,
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
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 24,
              padding: 22,
              boxShadow: "0 20px 50px rgba(15,23,42,.08)",
              display: "grid",
              gap: 14,
            }}
          >
            <div
              style={{
                fontWeight: 900,
                fontSize: 20,
                color: "#0f172a",
              }}
            >
              Visão da plataforma
            </div>

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 18,
                padding: 16,
                background: "#f8fafc",
              }}
            >
              <div style={{ fontSize: 13, color: "#64748b" }}>Histórico</div>
              <div style={{ marginTop: 6, fontWeight: 800, fontSize: 22 }}>
                Acompanhamento longitudinal
              </div>
            </div>

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 18,
                padding: 16,
                background: "#f8fafc",
              }}
            >
              <div style={{ fontSize: 13, color: "#64748b" }}>Fluxo</div>
              <div style={{ marginTop: 6, fontWeight: 800, fontSize: 22 }}>
                Pendências, respostas e organização
              </div>
            </div>

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 18,
                padding: 16,
                background: "#f8fafc",
              }}
            >
              <div style={{ fontSize: 13, color: "#64748b" }}>Relatórios</div>
              <div style={{ marginTop: 6, fontWeight: 800, fontSize: 22 }}>
                Leitura estruturada dos resultados
              </div>
            </div>
          </div>
        </section>

        <section id="beneficios" style={{ marginTop: 54 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "#2563eb",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Benefícios
          </div>

          <h2 style={{ fontSize: 32, margin: "10px 0 8px" }}>
            Uma plataforma feita para clareza e utilidade
          </h2>

          <p
            style={{
              color: "#64748b",
              lineHeight: 1.7,
              maxWidth: 760,
              margin: 0,
            }}
          >
            A ENDURE integra avaliação, histórico e acesso organizado a
            resultados em uma experiência mais clara para atletas e equipe
            técnica.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 18,
              marginTop: 22,
            }}
          >
            {[
              {
                title: "Rigor psicométrico",
                text: "Construção baseada em princípios técnicos sólidos e foco em qualidade de medida.",
              },
              {
                title: "Aplicação prática",
                text: "Útil para pesquisa, monitoramento e apoio à tomada de decisão.",
              },
              {
                title: "Leitura estruturada",
                text: "Resultados organizados para interpretação mais rápida e consistente.",
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 20,
                  padding: 20,
                  boxShadow: "0 14px 40px rgba(15,23,42,.05)",
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 18 }}>{item.title}</div>
                <p
                  style={{
                    color: "#64748b",
                    lineHeight: 1.7,
                    margin: "10px 0 0",
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
