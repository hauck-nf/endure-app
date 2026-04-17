type Row = Record<string, any>;

export default function RequestsTable({ rows }: { rows: Row[] }) {
  return (
    <div style={{ border: "1px solid #222", borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Pendências (mais recentes)</div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["request_id", "atleta", "título", "status", "instrument_version", "due_at", "link"].map((h) => (
                <th key={h} style={{ textAlign: "left", fontSize: 12, padding: "10px 8px", borderBottom: "1px solid #222", opacity: 0.85 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 12, opacity: 0.8 }}>Sem dados.</td></tr>
            ) : rows.map((r) => {
              const link = `/athlete/request/${r.request_id}`;
              return (
                <tr key={r.request_id}>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid #111" }}>{r.request_id}</td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid #111" }}>{r.athlete_name ?? r.athlete_id}</td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid #111" }}>{r.title ?? "—"}</td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid #111" }}>{r.status}</td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid #111" }}>{r.instrument_version ?? "—"}</td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid #111" }}>{r.due_at ?? "—"}</td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid #111" }}>
                    <a href={link}>{link}</a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
