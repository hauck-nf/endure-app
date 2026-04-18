"use client";

type Profile = "admin" | "athlete";

export default function AdminProfileSwitcher() {
  function go(next: Profile) {
    if (next === "admin") return;
    window.location.assign("/athlete/pending");
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ fontSize: 14, color: "#6b7280" }}>Perfil:</div>
      <select
        value="admin"
        onChange={(e) => go(e.target.value as Profile)}
        style={{
          height: 40,
          padding: "0 12px",
          borderRadius: 14,
          border: "1px solid #e5e7eb",
          background: "#fff",
          fontWeight: 800,
          outline: "none",
        }}
      >
        <option value="admin">admin</option>
        <option value="athlete">athlete</option>
      </select>
    </div>
  );
}
