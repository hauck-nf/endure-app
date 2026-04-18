"use client";

import { useState } from "react";
import RoleSwitcher from "@/app/_components/RoleSwitcher";

const items = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/athletes", label: "Meus atletas" },
  { href: "/admin/assign/evaluation", label: "Designar avaliação" },
  { href: "/admin/requests", label: "Designações (antiga)" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="admWrap">
      <style>{`
        :root{
          --bg:#f9fafb; --card:#fff; --border:#e5e7eb;
          --text:#111827; --muted:#6b7280;
          --shadow:0 14px 40px rgba(17,24,39,.08);
          --radius:14px; --sidebarW:260px; --drawerW:280px;
        }
        .admWrap{ min-height:100vh; background:var(--bg); color:var(--text); }

        /* Top bar */
        .admTop{
          position: sticky; top:0; z-index:50;
          padding: 12px 12px;
          border-bottom: 1px solid var(--border);
          background: rgba(255,255,255,.92);
          backdrop-filter: blur(12px);
          display:flex; align-items:center; justify-content:space-between;
          gap: 12px;
        }
        .admLeft{ display:flex; align-items:center; gap:10px; min-width:0; }
        .admBrand{ display:flex; align-items:center; gap:10px; text-decoration:none; color:inherit; min-width:0; }
        .admBrand img{ width:28px; height:28px; object-fit:contain; border-radius:6px; }
        .admBrand strong{ letter-spacing:.4px; }
        .admBrand span{ font-size:12px; color:var(--muted); }

        /* Hamburger */
        .admHamb{
          width: 40px; height: 40px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background:#fff;
          display:none;
          align-items:center; justify-content:center;
        }
        .admHamb svg{ width:18px; height:18px; }

        /* Layout desktop */
        .admGrid{ display:grid; grid-template-columns: var(--sidebarW) 1fr; gap:16px; max-width:1200px; margin:0 auto; }
        .admSide{
          padding: 16px;
          border-right: 1px solid var(--border);
          background:#fff;
          min-height: calc(100vh - 57px);
        }
        .admMain{ padding: 16px; min-width:0; }

        /* Sidebar links (desktop) */
        .admNavTitle{ font-size:12px; color:var(--muted); margin-bottom:10px; }
        .admNavCards{ display:grid; gap:10px; }
        .admNavCards a{
  display:flex; align-items:center; justify-content:space-between;
  padding: 12px 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background:#fff;
  text-decoration:none;      /* <- tira sublinhado */
  color: var(--text);        /* <- tira roxo */
  font-weight: 700;
  font-size: 15px;
}
.admNavCards a:visited{ color: var(--text); }
.admNavCards a:hover{ background:#f9fafb; }
        .admNavCards a span:last-child{ color:#9ca3af; font-size:18px; }

        /* Mobile drawer */
        .admOverlay{ position:fixed; inset:0; z-index:60; background:rgba(17,24,39,.45); display:none; }
        .admDrawer{
          position:fixed; top:0; left:0; z-index:70;
          width: var(--drawerW); max-width: 86vw; height: 100vh;
          background:#fff;
          border-right: 1px solid var(--border);
          box-shadow: var(--shadow);
          transform: translateX(-105%);
          transition: transform .22s ease;
          padding: 12px;
          display:grid;
          grid-template-rows:auto 1fr;
          gap: 10px;
        }
        .admDrawerTop{ display:flex; align-items:center; justify-content:space-between; gap:10px; padding:2px 2px 6px; }
        .admClose{ width:38px; height:38px; border-radius:12px; border:1px solid var(--border); background:#fff; font-size:18px; }

        /* Mobile: hide sidebar, show hamburger */
        /* Drawer mobile (compact like athlete) */
        .admNavList{
          display:flex;
          flex-direction:column;
          gap: 6px;
          border: none;
          background: transparent;
        }
        .admNavItem{
          display:flex;
          align-items:center;
          justify-content:space-between;
          padding: 12px 12px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background:#fff;
          text-decoration:none;
          color: var(--text);
          font-weight: 700;
          font-size: 15px;
        }
        .admNavItem span:last-child{ color:#9ca3af; font-size: 18px; }

          /* admNavCards-mobile-compact */
          .admNavCards{ gap: 6px; }
          .admNavCards a{
  display:flex; align-items:center; justify-content:space-between;
  padding: 12px 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background:#fff;
  text-decoration:none;      /* <- tira sublinhado */
  color: var(--text);        /* <- tira roxo */
  font-weight: 700;
  font-size: 15px;
}
.admNavCards a:visited{ color: var(--text); }
.admNavCards a:hover{ background:#f9fafb; }
          .admNavCards a span:last-child{ font-size: 16px; }
          .admGrid{ grid-template-columns: 1fr; }
          .admSide{ display:none; }
          .admMain{ padding: 12px; }
          .admHamb{ display:inline-flex; }
        }
      `}</style>

      <div className="admTop">
        <div className="admLeft">
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
        <nav className="admNavList">
          {items.map((it) => (
            <a key={it.href} href={it.href} onClick={() => setOpen(false)}>
              <span>{it.label}</span><span>›</span>
            </a>
          ))}
        </nav>
      </aside>

      <div className="admGrid">
        <aside className="admSide">
          <div className="admNavTitle">Menu</div>
          <nav className="admNavList">
            {items.map((it) => (
              <a key={it.href} href={it.href}>
                <span>{it.label}</span><span>›</span>
              </a>
            ))}
          </nav>
        </aside>
        <main className="admMain">{children}</main>
      </div>
    </div>
  );
}
