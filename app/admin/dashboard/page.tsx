import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabaseServer";

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 20,
  boxShadow: "0 14px 40px rgba(17,24,39,.06)",
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/login");

  const [
    { count: pending },
    { count: inProgress },
    { count: submitted },
    { count: athletes },
    { data: recentRequests },
  ] = await Promise.all([
    supabase
      .from("assessment_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),

    supabase
      .from("assessment_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "in_progress"),

    supabase
      .from("assessment_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "submitted"),

    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "athlete"),

    supabase
      .from("assessment_requests")
      .select("request_id, title, status, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const kpis = [
    { label: "Pendentes", value: pending ?? 0 },
    { label: "Em andamento", value: inProgress ?? 0 },
    { label: "Submetidas", value: submitted ?? 0 },
    { label: "Atletas", value: athletes ?? 0 },
  ];

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section style={cardStyle}>
        <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 700 }}>
          Painel administrativo
        </div>
        <h1 style={{ margin: "8px 0 8px", fontSize: 32 }}>
          Dashboard do ENDURE
        </h1>
        <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.7 }}>
          Acompanhe o volume de avaliações, visualize pendências recentes e
          acesse rapidamente as principais ações do sistema.
        </p>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 16,
        }}
      >
        {kpis.map((item) => (
          <div key={item.label} style={cardStyle}>
            <div style={{ color: "#6b7280", fontSize: 14 }}>{item.label}</div>
            <div style={{ fontSize: 34, fontWeight: 900, marginTop: 8 }}>
              {item.value}
            </div>
          </div>
        ))}
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr .9fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <div>
              <div style={{ fontWeight: 900, fontSize: 20 }}>
                Pendências recentes
              </div>
              <div style={{ color: "#6b7280", fontSize: 14, marginTop: 4 }}>
                Últimas solicitações criadas no sistema.
              </div>
            </div>

            <Link
              href="/admin/requests"
              style={{
                textDecoration: "none",
                color: "#111827",
                fontWeight: 800,
              }}
            >
              Ver tudo
            </Link>
          </div>

          {!recentRequests || recentRequests.length === 0 ? (
            <div
              style={{
                border: "1px dashed #d1d5db",
                borderRadius: 16,
                padding: 18,
                color: "#6b7280",
              }}
            >
              Nenhuma solicitação encontrada no momento.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {recentRequests.map((item: any) => (
                <div
                  key={item.request_id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 16,
                    padding: 14,
                    display: "grid",
                    gap: 6,
                    background: "#fcfcfd",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <strong style={{ fontSize: 15 }}>
                      {item.title || "Solicitação sem título"}
                    </strong>

                    <span
                      style={{
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontSize: 12,
                        fontWeight: 800,
                        border: "1px solid #d1d5db",
                        background: "#f9fafb",
                        color: "#374151",
                        textTransform: "capitalize",
                      }}
                    >
                      {String(item.status ?? "—").replace("_", " ")}
                    </span>
                  </div>

                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    Criada em{" "}
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString("pt-BR")
                      : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={cardStyle}>
            <div style={{ fontWeight: 900, fontSize: 20 }}>Ações rápidas</div>
            <div style={{ color: "#6b7280", fontSize: 14, marginTop: 4 }}>
              Acesse os fluxos mais usados no dia a dia.
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
              {[
                { href: "/admin/assign/evaluation", label: "Designar avaliação" },
                { href: "/admin/athletes", label: "Ver atletas" },
                { href: "/admin/requests", label: "Gerenciar pendências" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    textDecoration: "none",
                    color: "#111827",
                    border: "1px solid #e5e7eb",
                    borderRadius: 14,
                    padding: "14px 16px",
                    fontWeight: 800,
                    background: "#fff",
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontWeight: 900, fontSize: 20 }}>Leitura do painel</div>
            <ul style={{ color: "#6b7280", lineHeight: 1.8, paddingLeft: 18, marginBottom: 0 }}>
              <li>Pendentes: solicitações ainda não iniciadas.</li>
              <li>Em andamento: avaliações abertas e não concluídas.</li>
              <li>Submetidas: avaliações já enviadas pelo atleta.</li>
              <li>Atletas: usuários com perfil de atleta cadastrados no sistema.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}