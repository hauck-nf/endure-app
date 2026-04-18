import Link from "next/link";

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 14px 40px rgba(17,24,39,.06)",
};

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #f8fafc 0%, #eef2ff 45%, #f8fafc 100%)",
        color: "#111827",
      }}
    >
      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "56px 20px 28px",
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
              style={{ width: 34, height: 34, objectFit: "contain" }}
            />
            <div>
              <div style={{ fontWeight: 900, letterSpacing: 0.8 }}>ENDURE</div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                Avaliação socioemocional em atletas
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              href="/login"
              style={{
                height: 44,
                padding: "0 18px",
                borderRadius: 14,
                border: "1px solid #d1d5db",
                background: "#fff",
                display: "inline-flex",
                alignItems: "center",
                fontWeight: 700,
                textDecoration: "none",
                color: "#111827",
              }}
            >
              Entrar
            </Link>
            <Link
              href="/login"
              style={{
                height: 44,
                padding: "0 18px",
                borderRadius: 14,
                border: "1px solid #111827",
                background: "#111827",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              Acessar plataforma
            </Link>
          </div>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr .8fr",
            gap: 24,
            marginTop: 40,
          }}
        >
          <div style={{ alignSelf: "center" }}>
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
              Plataforma para atletas, treinadores e equipe técnica
            </div>

            <h1
              style={{
                margin: "18px 0 14px",
                fontSize: "clamp(2rem, 5vw, 4rem)",
                lineHeight: 1.05,
                letterSpacing: -1.5,
              }}
            >
              Avaliação socioemocional com clareza,
              <br />
              histórico e utilidade prática.
            </h1>

            <p
              style={{
                fontSize: 18,
                lineHeight: 1.65,
                color: "#4b5563",
                maxWidth: 720,
                margin: 0,
              }}
            >
              O ENDURE organiza avaliações, acompanha a evolução de atletas ao
              longo do tempo e transforma respostas em informação útil para
              acompanhamento, intervenção e pesquisa.
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
                  border: "1px solid #111827",
                  background: "#111827",
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                Entrar na plataforma
              </Link>

              <a
                href="#como-funciona"
                style={{
                  height: 48,
                  padding: "0 20px",
                  borderRadius: 14,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  color: "#111827",
                  display: "inline-flex",
                  alignItems: "center",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Entender como funciona
              </a>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
                marginTop: 28,
              }}
            >
              {[
                "Histórico longitudinal",
                "Relatórios organizados",
                "Fluxo simples de uso",
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    background: "rgba(255,255,255,.72)",
                    border: "1px solid #e5e7eb",
                    borderRadius: 16,
                    padding: 14,
                    fontWeight: 700,
                    color: "#374151",
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              ...cardStyle,
              padding: 0,
              overflow: "hidden",
              background:
                "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
            }}
          >
            <div
              style={{
                padding: 18,
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: "#22c55e",
                }}
              />
              <div style={{ fontWeight: 800 }}>Visão da plataforma</div>
            </div>

            <div style={{ padding: 20, display: "grid", gap: 14 }}>
              <div style={cardStyle}>
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  Próxima avaliação
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>
                  Pendência ativa
                </div>
                <div style={{ fontSize: 14, color: "#6b7280", marginTop: 6 }}>
                  Convites organizados e acesso simples para resposta.
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                }}
              >
                <div style={cardStyle}>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    Histórico
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>
                    Evolução
                  </div>
                </div>
                <div style={cardStyle}>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    Relatórios
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>
                    Leitura rápida
                  </div>
                </div>
              </div>

              <div style={cardStyle}>
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  Uso institucional
                </div>
                <div style={{ marginTop: 8, color: "#374151", lineHeight: 1.6 }}>
                  Para atletas, treinadores e pesquisadores em um mesmo ambiente,
                  com rotas específicas e estrutura consistente.
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>

      <section
        id="como-funciona"
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "24px 20px 72px",
        }}
      >
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "#2563eb",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Como funciona
          </div>
          <h2 style={{ fontSize: 34, margin: "10px 0 8px" }}>
            Um fluxo simples e claro
          </h2>
          <p style={{ color: "#6b7280", margin: 0, maxWidth: 760, lineHeight: 1.7 }}>
            A plataforma foi pensada para reduzir atrito no uso diário e
            organizar o acompanhamento socioemocional sem complicar a rotina.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 18,
          }}
        >
          {[
            {
              title: "1. Designar ou abrir avaliação",
              text: "A equipe cria pendências e o atleta acessa o fluxo com clareza.",
            },
            {
              title: "2. Responder e registrar",
              text: "As respostas ficam organizadas e disponíveis para acompanhamento.",
            },
            {
              title: "3. Visualizar evolução",
              text: "Dashboard, histórico e relatórios ajudam a interpretar resultados ao longo do tempo.",
            },
          ].map((item) => (
            <div key={item.title} style={cardStyle}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>{item.title}</div>
              <p style={{ margin: "10px 0 0", color: "#6b7280", lineHeight: 1.7 }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}