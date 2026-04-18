import Link from "next/link";
import { requireAdmin } from "@/src/lib/requireAdmin";
import CreateAthleteForm from "./CreateAthleteForm";

export default async function AdminAthletesPage() {
  const { supabase } = await requireAdmin();

  const { data: athletes, error } = await supabase
    .from("athletes")
    .select("athlete_id, full_name, email, team, sport_primary")
    .order("full_name", { ascending: true })
    .limit(1000);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <style>{`
        /* Alinha com seu globals: fundo branco, texto #111827, bordas frias */
        .card{
          background:#fff;
          border:1px solid #e5e7eb;
          border-radius:16px;
          overflow:hidden;
        }

        .titleRow{
          display:flex;
          align-items:flex-end;
          justify-content:space-between;
          gap:12px;
        }
        .titleRow h1{
          margin:0;
          font-size:22px;
          font-weight:900;
          letter-spacing:-0.02em;
          color:#111827;
        }
        .subtitle{
          margin:0;
          margin-top:4px;
          font-size:13px;
          color:#6b7280;
        }
        .count{
          font-size:13px;
          color:#6b7280;
          font-weight:700;
        }

        table{ width:100%; border-collapse:collapse; }
        thead th{
          text-align:left;
          font-size:12px;
          letter-spacing:0.02em;
          font-weight:800;
          color:#6b7280;
          padding: 12px 14px;
          border-bottom:1px solid #e5e7eb;
          background:#fff;
          white-space:nowrap;
        }
        tbody td{
          padding: 12px 14px;
          border-bottom:1px solid #f1f5f9;
          vertical-align:middle;
          font-size:14px;
          color:#111827;
        }
        tbody tr:hover td{ background:#fbfbfc; }

        .name{
          font-weight:850;
          line-height:1.15;
          letter-spacing:-0.01em;
        }
        .muted{
          color:#6b7280;
          font-size:13px;
        }

        /* Ações: compactas, consistentes, “CRM premium” */
        .actions{
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          justify-content:flex-start;
        }
        .btn{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          height:34px;              /* menor no desktop */
          padding: 0 12px;
          border-radius:14px;
          border:1px solid #e5e7eb;
          background:#fff;
          font-size:13px;
          font-weight:800;
          color:#111827;
          text-decoration:none;
          white-space:nowrap;
          line-height:1;
        }
        .btn:active{ transform: translateY(1px); }
        .btnPrimary{
          border-color:#111827;
          background:#111827;
          color:#fff;
        }
        .chev{ font-size:16px; opacity:0.85; margin-left:2px; }

        /* Mobile: reduz colunas e aumenta alvo mínimo (44px) */
        @media (max-width: 720px) {
          .hideMobile{ display:none; }
          tbody td{ font-size:13px; }
          .btn{ height:44px; border-radius:16px; } /* alvo mínimo 44px */
        }

        /* Cadastrar atleta: discreto */
        details.addBox{
          border:1px solid #e5e7eb;
          border-radius:16px;
          background:#fff;
          padding: 10px 12px;
        }
        details.addBox > summary{
          cursor:pointer;
          list-style:none;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          font-weight:900;
          font-size:14px;
          color:#111827;
        }
        details.addBox > summary::-webkit-details-marker{ display:none; }
        .summaryHint{
          font-size:12px;
          color:#6b7280;
          font-weight:700;
        }
        .addInner{ margin-top:10px; }
      `}</style>

      <div className="titleRow">
        <div>
          <h1>Meus atletas</h1>
          <p className="subtitle">Cadastros e acesso rápido às telas do atleta.</p>
        </div>
        <div className="count">{(athletes ?? []).length} atleta(s)</div>
      </div>

      {error ? (
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Erro</div>
          <div className="muted">{error.message}</div>
        </div>
      ) : null}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th style={{ width: "34%" }}>Nome</th>
              <th style={{ width: "28%" }}>Email</th>
              <th className="hideMobile" style={{ width: "16%" }}>Equipe</th>
              <th className="hideMobile" style={{ width: "12%" }}>Esporte</th>
              <th style={{ width: "10%", minWidth: 220 }}>Ações</th>
            </tr>
          </thead>

          <tbody>
            {(athletes ?? []).map((a) => (
              <tr key={a.athlete_id}>
                <td>
                  <div className="name">{a.full_name}</div>
                </td>

                <td>
                  <div className="muted">{a.email ?? "—"}</div>
                </td>

                <td className="hideMobile">
                  <div className="muted">{a.team ?? "—"}</div>
                </td>

                <td className="hideMobile">
                  <div className="muted">{a.sport_primary ?? "—"}</div>
                </td>

                <td>
                  <div className="actions">
                    <Link className="btn btnPrimary" href={`/admin/athletes/${a.athlete_id}`}>
                      Abrir <span aria-hidden="true" className="chev">›</span>
                    </Link>

                    <Link className="btn" href={`/admin/athletes/${a.athlete_id}/assigned`}>
                      Avaliações <span aria-hidden="true" className="chev">›</span>
                    </Link>

                    <Link className="btn" href={`/admin/athletes/${a.athlete_id}/profile`}>
                      Dados <span aria-hidden="true" className="chev">›</span>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}

            {(athletes ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 14 }}>
                  <div className="muted">Nenhum atleta encontrado.</div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <details className="addBox">
        <summary>
          <span>Cadastrar atleta</span>
          <span className="summaryHint">Abrir ▾</span>
        </summary>
        <div className="addInner">
          <CreateAthleteForm />
        </div>
      </details>
    </div>
  );
}