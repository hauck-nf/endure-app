import { requireAdmin } from "@/src/lib/requireAdmin";
import CreateAthleteForm from "./CreateAthleteForm";

export default async function AdminAthletesPage() {
  const { supabase } = await requireAdmin();

  const { data: athletes, error } = await supabase
    .from("athletes")
    .select("athlete_id, full_name")
    .order("full_name", { ascending: true })
    .limit(2000);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Meus atletas</h1>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          {athletes?.length ?? 0} atleta(s)
        </div>
      </div>

      {error ? (
        <div style={{ border: "1px solid #fecaca", background: "#fff1f2", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Erro ao carregar atletas</div>
          <div style={{ fontSize: 13, color: "#7f1d1d" }}>{error.message}</div>
        </div>
      ) : null}

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Nome", "Ações"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    fontSize: 12,
                    padding: "12px 12px",
                    borderBottom: "1px solid #e5e7eb",
                    color: "#6b7280",
                    fontWeight: 600,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {(athletes ?? []).map((a: any) => {
              const id = a?.athlete_id ? String(a.athlete_id) : "";

              return (
                <tr key={id || a?.full_name}>
                  <td style={{ padding: "12px 12px", borderBottom: "1px solid #f3f4f6", fontWeight: 600 }}>
                    {a.full_name ?? "—"}
                  </td>

                  <td style={{ padding: "12px 12px", borderBottom: "1px solid #f3f4f6" }}>
                    {id ? (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <a
                          href={`/admin/athletes/${id}/assigned`}
                          style={{
                            textDecoration: "none",
                            border: "1px solid #e5e7eb",
                            padding: "6px 10px",
                            borderRadius: 10,
                            fontWeight: 600,
                            color: "#111827",
                            background: "#fff",
                            display: "inline-block",
                          }}
                        >
                          Avaliações
                        </a>

                        <a
                          href={`/admin/athletes/${id}/dashboard/view`}
                          style={{
                            textDecoration: "none",
                            border: "1px solid #e5e7eb",
                            padding: "6px 10px",
                            borderRadius: 10,
                            fontWeight: 600,
                            color: "#111827",
                            background: "#fff",
                            display: "inline-block",
                          }}
                        >
                          Dashboard
                        </a>

                        <a
                          href={`/admin/athletes/${id}/profile`}
                          style={{
                            textDecoration: "none",
                            border: "1px solid #e5e7eb",
                            padding: "6px 10px",
                            borderRadius: 10,
                            fontWeight: 600,
                            color: "#111827",
                            background: "#fff",
                            display: "inline-block",
                          }}
                        >
                          Dados
                        </a>
                      </div>
                    ) : (
                      <span style={{ color: "#b91c1c", fontSize: 12 }}>Sem athlete_id</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {(athletes ?? []).length === 0 ? (
              <tr>
                <td colSpan={2} style={{ padding: 12, color: "#6b7280" }}>
                  Nenhum atleta encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* cadastro discreto */}
      <div style={{ marginTop: 4 }}>
        <CreateAthleteForm />
      </div>
    </div>
  );
}
