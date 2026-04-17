"use client";

import { useEffect, useState } from "react";
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

export default function AthleteLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  // fecha drawer quando trocar de rota (melhor UX)
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("popstate", close);
    return () => window.removeEventListener("popstate", close);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      {/* Top bar */}
      <div
        style={{
          padding: "12px 14px",
          borderBottom: "1px solid #e5e7eb",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        {/* Left: hamburger (mobile) + brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="athleteHamburger"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "#fff",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: "18px",
            }}
            aria-label="Abrir menu"
            title="Menu"
          >
            ☰
          </button>

          <a
            href="/athlete"
            style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}
          >
            <img
              src="/endure_logo.png"
              alt="ENDURE"
              style={{ width: 28, height: 28, objectFit: "contain", borderRadius: 6 }}
            />
            <div style={{ display: "grid", lineHeight: 1.1 }}>
              <strong style={{ letterSpacing: 0.4 }}>ENDURE</strong>
              <span style={{ fontSize: 12, color: "#6b7280" }}>Área do atleta</span>
            </div>
          </a>
        </div>

        {/* Right: role switch */}
        <RoleSwitcher />
      </div>

      {/* Drawer overlay (mobile) */}
      {open ? (
        <div
          className="athleteOverlay"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17,24,39,0.35)",
            zIndex: 40,
          }}
        />
      ) : null}

      {/* Sidebar drawer */}
      <aside
        className="athleteSidebar"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          width: 280,
          background: "#fff",
          borderRight: "1px solid #e5e7eb",
          padding: 16,
          zIndex: 50,
          transform: open ? "translateX(0)" : "translateX(-110%)",
          transition: "transform 200ms ease",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Menu</div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "#fff",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: "18px",
            }}
            aria-label="Fechar menu"
            title="Fechar"
          >
            ×
          </button>
        </div>

        <nav style={{ display: "grid", gap: 10 }}>
          <a href="/athlete/dashboard" style={linkStyle} onClick={() => setOpen(false)}>Dashboard</a>
          <a href="/athlete/pending" style={linkStyle} onClick={() => setOpen(false)}>Pendentes</a>
          <a href="/athlete/history" style={linkStyle} onClick={() => setOpen(false)}>Histórico</a>
        </nav>

        <div style={{ marginTop: 14, fontSize: 12, color: "#9ca3af" }}>
          Experiência otimizada para celular
        </div>
      </aside>

      {/* Desktop layout: sidebar fixa + conteúdo */}
      <div className="athleteDesktopWrap" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
        <aside
          className="athleteDesktopSidebar"
          style={{
            padding: 16,
            borderRight: "1px solid #e5e7eb",
            background: "#fff",
            minHeight: "calc(100vh - 57px)",
          }}
        >
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>Menu</div>
          <nav style={{ display: "grid", gap: 10 }}>
            <a href="/athlete/dashboard" style={linkStyle}>Dashboard</a>
            <a href="/athlete/pending" style={linkStyle}>Pendentes</a>
            <a href="/athlete/history" style={linkStyle}>Histórico</a>
          </nav>
        </aside>

        <main className="athleteMain" style={{ padding: 16 }}>
          {children}
        </main>
      </div>

      {/* Responsive CSS */}
      <style>{`
        /* Mobile-first: hide desktop wrap; show hamburger + drawer */
        .athleteDesktopWrap { display: none; }
        .athleteHamburger { display: inline-flex; align-items: center; justify-content: center; }

        @media (min-width: 900px) {
          /* Desktop: show fixed sidebar layout; hide hamburger/drawer */
          .athleteDesktopWrap { display: grid; }
          .athleteHamburger { display: none; }
          .athleteOverlay { display: none; }
          .athleteSidebar { display: none; }
          .athleteMain { padding: 20px; }
        }

        @media (max-width: 420px) {
          .athleteMain { padding: 12px; }
        }
      `}</style>
    </div>
  );
}
