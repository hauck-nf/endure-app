"use client";

type ReqRow = {
  request_id: string;
  title: string | null;
  status: string;
  instrument_version: string | null;
  reference_window: string | null;
  due_at: string | null;
  created_at: string;
  selection_json: any;
};

function buttonStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: 38,
    padding: "0 12px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 800,
    fontFamily: "inherit",
    whiteSpace: "nowrap",
    boxSizing: "border-box",
  };
}

export default function RequestActions({
  athleteId,
  request,
}: {
  athleteId: string;
  request: ReqRow;
}) {
  const href = `/athlete/flow/${request.request_id}`;

  return (
    <div
      style={{
        display: "grid",
        gap: 8,
        width: 148,
      }}
    >
      <a href={href} target="_blank" rel="noreferrer" style={buttonStyle()}>
        Abrir
      </a>
    </div>
  );
}