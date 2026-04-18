"use client";

import { useEffect, useState } from "react";
import RoleSwitcher from "@/app/_components/RoleSwitcher";

const linkStyle: React.CSSProperties = {
  display: "block",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#fff",
  textDecoration: "none",
  color: "#111827",
  fontWeight: 650,
  fontSize: 13,
};

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  // fecha drawer ao navegar (melhor UX)
  useEffect(() => {
    const onPop = () => setOpen(false);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const Menu = () => (
    <nav style={{ display: "grid", gap: 10 }}>
      <a href="/admin/dashboard" style={linkStyle}>Dashboard</a>
      <a href="/admin/athletes" style={linkStyle}>Meus atletas</a>
      <a href="/admin/assign/evaluation" style={linkStyle}>Designar avaliação</a>
      <a href="/admin/requests" style={linkStyle}>Designações (antiga)</a>
    </nav>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      <style>{`
        :root{ --border:#e5e7eb; }
        .admTop{
          position: sticky; top:0; z-index:50;
          padding: 14px 16px;
          border-bottom: 1px solid var(--border);
          background: rgba(255,255,255,.92);
          backdrop-filter: blur(12px);
          display:flex; align-items:center; justify-content:space-between;
          gap: 12px;
        }
        .admBrand{ display:flex; align-items:center; gap:10px; text-decoration:none; color:inherit; }
        .admBrand img{ width:28px; height:28px; object-fit:contain; border-radius:6px; }
        .admBrand strong{ letter-spacing:.4px; }
        .admBrand span{ font-size:12px; color:#6b7280; }

        .admGrid{ display:grid; grid-template-columns: 260px 1fr; gap:16px; }
        .admSide{ padding:16px; border-right: 1px solid var(--border); background:#fff; min-height: calc(100vh - 57px); }
        .admMain{ padding:16px; }

        /* Mobile: esconde sidebar e usa drawer */
        .admHamb{
          width: 40px; height: 40px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background:#fff;
          display:none;
          align-items:center; justify-content:center;
        }
        .admHamb svg{ width:18px; height:18px; }

        .admOverlay{ position:fixed; inset:0; z-index:60; background:rgba(17,24,39,.45); display:none; }
        .admDrawer{
          position:fixed; top:0; left:0; z-index:70;
          width: 280px; max-width: 86vw; height: 100vh;
          background:#fff; border-right:1px solid var(--border);
          box-shadow: 0 14px 40px rgba(17,24,39,.10);
          transform: translateX(-105%); transition: transform .22s ease;
          padding: 12px;
          display:grid; grid-template-rows:auto 1fr; gap: 10px;
        }
        .admDrawerTop{ display:flex; align-items:center; justify-content:space-between; gap:10px; padding:2px 2px 6px; }
        .admClose{ width:38px; height:38px; border-radius:12px; border:1px solid var(--border); background:#fff; font-size:18px; }

        @media (max-width: 899px){
          .admGrid{ grid-template-columns: 1fr; }
          .admSide{ display:none; }
          .admMain{ padding:12px; }
          .admHamb{ display:inline-flex; }
        }
      `}</style>

      <div className="admTop">
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button className="admHamb" type="button" aria-label="Abrir menu" onClick={() => setOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>

          <a href="/admin/dashboard" className="admBrand">
            <img src="/endure_logo.png" alt="ENDURE" />
            <div style={{ display:"grid", lineHeight:1.1 }}>
              <strong>ENDURE</strong>
              <span>Admin</span>
            </div>
          </a>
        </div>

        <RoleSwitcher />
      </div>

      {/* Drawer mobile */}
      <div className="admOverlay" style={{ display: open ? "block" : "none" }} onClick={() => setOpen(false)} />
      <aside className="admDrawer" style={{ transform: open ? "translateX(0)" : "translateX(-105%)" }}>
        <div className="admDrawerTop">
          <div style={{ display:"flex", alignItems:"center", gap:10, fontWeight:900 }}>
            <img src="/endure_logo.png" alt="ENDURE" style={{ width:22, height:22, objectFit:"contain" }} />
            <div>Menu</div>
          </div>
          <button className="admClose" type="button" aria-label="Fechar" onClick={() => setOpen(false)}>✕</button>
        </div>
        <Menu />
      </aside>

      <div className="admGrid">
        <aside className="admSide">
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>Menu</div>
          <Menu />
        </aside>
        <main className="admMain">{children}</main>
      </div>
    </div>
  );
}
