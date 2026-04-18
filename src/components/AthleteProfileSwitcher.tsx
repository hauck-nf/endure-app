"use client";

type Profile = "admin" | "athlete";

export default function AthleteProfileSwitcher() {
  function go(next: Profile) {
    if (next === "athlete") return;
    window.location.assign("/admin/dashboard");
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ fontSize: 14, color: "#6b7280" }}>Perfil:</div>
      <select
        value="athlete"
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
        <option value="athlete">athlete</option>
        <option value="admin">admin</option>
      </select>
    </div>
  );
}
