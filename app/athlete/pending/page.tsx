import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabaseServer";

export const dynamic = "force-dynamic";

function fmtDate(s?: string | null) {
  if (!s) return "Sem prazo definido";
  try {
    return new Date(s).toLocaleString("pt-BR");
  } catch {
    return s;
  }
}

function statusLabel(status?: string | null) {
  if (status === "pending") return "Pendente";
  if (status === "in_progress") return "Em andamento";
  if (!status) return "Sem status";
  return status;
}

function statusStyle(status?: string | null): React.CSSProperties {
  if (status === "pending") {
    return {
      background: "#fff7ed",
      border: "1px solid #fed7aa",
      color: "#9a3412",
    };
  }

  if (status === "in_progress") {
    return {
      background: "#eff6ff",
      border: "1px solid #bfdbfe",
      color: "#1d4ed8",
    };
  }

  return {
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    color: "#475569",
  };
}

export default async function AthletePendingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/athlete/pending");

  const { data: ath, error: athErr } = await supabase
    .from("athletes")
    .select("athlete_id, full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (athErr || !ath?.athlete_id) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
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
              fontWeight: 800,
              letterSpacing: 0.3,
            }}
          >
            Área do atleta
          </div>

          <h1
            style={{
              margin: "14px 0 10px",
              fontSize: 30,
              lineHeight: 1.1,
              letterSpacing: -0.6,
              color: "#0f172a",
            }}
          >
            Avaliações pendentes
          </h1>

          <p
            style={{
              margin: 0,
              color: "#64748b",
              lineHeight: 1.75,
              fontSize: 15,
            }}
          >
            Não consegui identificar seu cadastro de atleta.
          </p>
        </section>

        <div
          style={{
            border: "1px solid #fecaca",
            background: "#fff1f2",
            color: "#9f1239",
            borderRadius: 18,
            padding: 16,
          }}
        >
          <div style={{ fontWeight: 800 }}>Cadastro não localizado</div>
          <div style={{ marginTop: 8, lineHeight: 1.7 }}>
            Verifique se sua conta está vinculada corretamente ao seu perfil de
            atleta.
          </div>
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
            user_id: {user.id}
          </div>
        </div>
      </div>
    );
  }

  const { data: reqs, error: rErr } = await supabase
    .from("assessment_requests")
    .select("request_id, title, status, due_at, created_at")
    .eq("athlete_id", ath.athlete_id)
    .in("status", ["pending", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(200);

  const requests = reqs ?? [];

  return (
    <div style={{ display: "grid", gap: 16 }}>
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
            fontWeight: 800,
            letterSpacing: 0.3,
          }}
        >
          Área do atleta
        </div>

        <h1
          style={{
            margin: "14px 0 10px",
            fontSize: 30,
            lineHeight: 1.1,
            letterSpacing: -0.6,
            color: "#0f172a",
          }}
        >
          Avaliações pendentes
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
          Aqui você encontra as avaliações que ainda precisam ser respondidas ou
          que foram iniciadas e ainda não concluídas.
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
            fontWeight: 700,
          }}
        >
          {requests.length} {requests.length === 1 ? "avaliação" : "avaliações"}
        </div>
      </section>

      {rErr ? (
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
          Erro ao buscar avaliações: {rErr.message}
        </div>
      ) : null}

      {requests.length === 0 ? (
        <section
          style={{
            border: "1px solid #bbf7d0",
            background: "linear-gradient(180deg, #f0fdf4 0%, #f8fafc 100%)",
            borderRadius: 24,
            padding: 20,
            boxShadow: "0 18px 48px rgba(15,23,42,.04)",
          }}
        >
          <div
            style={{
              fontWeight: 800,
              color: "#166534",
              fontSize: 16,
            }}
          >
            Nenhuma avaliação pendente no momento.
          </div>

          <div
            style={{
              marginTop: 6,
              color: "#4b5563",
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            Quando uma nova solicitação for designada, ela aparecerá aqui.
          </div>
        </section>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {requests.map((r) => (
            <article
              key={r.request_id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 22,
                background: "#ffffff",
                padding: 18,
                boxShadow: "0 18px 48px rgba(15,23,42,.05)",
                display: "grid",
                gap: 14,
              }}
            >
              <div style={{ display: "grid", gap: 10 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "start",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 900,
                        color: "#0f172a",
                        lineHeight: 1.3,
                      }}
                    >
                      {r.title ?? "Avaliação"}
                    </div>
                  </div>

                  <span
                    style={{
                      ...statusStyle(r.status),
                      borderRadius: 999,
                      padding: "6px 10px",
                      fontSize: 12,
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {statusLabel(r.status)}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 6,
                    color: "#64748b",
                    fontSize: 14,
                    lineHeight: 1.7,
                  }}
                >
                  <div>
                    <strong style={{ color: "#334155" }}>Prazo:</strong>{" "}
                    {fmtDate(r.due_at)}
                  </div>
                  <div>
                    <strong style={{ color: "#334155" }}>Criada em:</strong>{" "}
                    {fmtDate(r.created_at)}
                  </div>
                </div>
              </div>

              <div>
                <Link
                  href={`/athlete/flow/${r.request_id}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    borderRadius: 14,
                    border: "1px solid #0f172a",
                    background: "#0f172a",
                    color: "#fff",
                    padding: "12px 16px",
                    fontWeight: 800,
                    minHeight: 46,
                    textDecoration: "none",
                    width: "100%",
                    maxWidth: 220,
                  }}
                >
                  Abrir avaliação <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}