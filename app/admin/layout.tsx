import RoleSwitcher from "@/app/_components/RoleSwitcher";

const linkStyle: React.CSSProperties = {
  display: "block",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  textDecoration: "none",
  color: "#111827",
  fontWeight: 600,
  fontSize: 13,
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      {/* Top bar */}
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid #e5e7eb",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <a
          href="/admin/dashboard"
          style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}
        >
          <img
            src="/endure_logo.png"
            alt="ENDURE"
            style={{ width: 28, height: 28, objectFit: "contain", borderRadius: 6 }}
          />
          <div style={{ display: "grid", lineHeight: 1.1 }}>
            <strong style={{ letterSpacing: 0.4 }}>ENDURE</strong>
            <span style={{ fontSize: 12, color: "#6b7280" }}>Admin</span>
          </div>
        </a>

        <RoleSwitcher />
      </div>

      {/* Body */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
        {/* Sidebar */}
        <aside
          style={{
            padding: 16,
            borderRight: "1px solid #e5e7eb",
            background: "#fff",
            minHeight: "calc(100vh - 57px)",
          }}
        >
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>Menu</div>

          <nav style={{ display: "grid", gap: 10 }}>
            <a href="/admin/dashboard" style={linkStyle}>Dashboard</a>
            <a href="/admin/athletes" style={linkStyle}>Meus atletas</a>
            <a href="/admin/assign/evaluation" style={linkStyle}>Designar avaliação</a>
            <a href="/admin/requests" style={linkStyle}>Designações (antiga)</a>
          </nav>
        </aside>

        {/* Content */}
        <main style={{ padding: 16 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
