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
    <div className="shell">
      <style>{`
        :root{
          --bg:#f7f8fb; --card:#fff; --border:#e5e7eb;
          --text:#111827; --muted:#6b7280;
          --shadow:0 16px 44px rgba(17,24,39,.08);
          --radius:16px;
          --sidebarW:280px;
        }

        .shell{ min-height:100vh; background:var(--bg); color:var(--text); }

        /* topbar */
        .topbar{
          position: sticky; top:0; z-index:40;
          display:flex; align-items:center; justify-content:space-between;
          padding: 14px 18px;
          background: rgba(255,255,255,.92);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
        }

        .brand{ display:flex; align-items:center; gap:12px; text-decoration:none; color:inherit; }
        .brand img{ width:28px; height:28px; object-fit:contain; border-radius:8px; }
        .brand strong{ letter-spacing:.4px; }
        .brand span{ font-size:12px; color:var(--muted); }

        /* layout desktop */
        .grid{
          display:grid;
          grid-template-columns: var(--sidebarW) 1fr;
          gap: 18px;
          padding: 18px;
        }
        .sidebar{
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 14px;
          height: fit-content; height: auto; position: sticky;
          top: 92px;
          align-self: start;
        }
        .main{
          min-width:0;
          background: transparent;
        }

        /* menu cards (igual athlete) */
        .navTitle{ font-size:12px; color:var(--muted); margin: 2px 0 10px; }
        .navList{ display:flex; flex-direction:column; gap:10px; }
        .navItem{
          display:flex; align-items:center; justify-content:space-between;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background:#fff;
          text-decoration:none;
          color: var(--text);
          font-weight: 750;
          font-size: 15px;
        }
        .navItem:visited{ color: var(--text); }
        .navItem:hover{ background:#f9fafb; }
        .chev{ color:#9ca3af; font-size:18px; }

        /* hamburger: só mobile */
        .hamb{
          width: 40px; height: 40px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: #fff;
          display:none;
          align-items:center; justify-content:center;
        }
        .hamb svg{ width:18px; height:18px; }

        /* drawer */
        .overlay{
          position:fixed; inset:0; z-index:60;
          background: rgba(17,24,39,.45);
          display:none;
        }
        .drawer{
          position:fixed; top:0; left:0; z-index:70;
          width: 300px; max-width: 86vw; height: 100vh;
          background:#fff;
          border-right: 1px solid var(--border);
          box-shadow: var(--shadow);
          transform: translateX(-105%);
          transition: transform .22s ease;
          padding: 12px;
          display:grid;
          grid-template-rows: auto 1fr;
          gap: 10px;
        }
        .drawerTop{
          display:flex; align-items:center; justify-content:space-between;
          gap: 10px;
          padding: 2px 2px 6px;
        }
        .close{
          width: 38px; height: 38px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background:#fff;
          font-size: 18px;
        }

        /* breakpoint: só esconde sidebar no MOBILE de verdade */
        @media (max-width: 720px){
          .grid{ grid-template-columns: 1fr; padding: 12px; }
          .sidebar{ display:none; }
          .hamb{ display:inline-flex; }
        }
      `}</style>

      <div className="topbar">
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button className="hamb" type="button" aria-label="Abrir menu" onClick={() => setOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>

          <a href="/admin/dashboard" className="brand">
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
      <div className="overlay" style={{ display: open ? "block" : "none" }} onClick={() => setOpen(false)} />
      <aside className="drawer" style={{ transform: open ? "translateX(0)" : "translateX(-105%)" }}>
        <div className="drawerTop">
          <div style={{ display:"flex", alignItems:"center", gap:10, fontWeight:900 }}>
            <img src="/endure_logo.png" alt="ENDURE" style={{ width:22, height:22, objectFit:"contain" }} />
            <div>Menu</div>
          </div>
          <button className="close" type="button" aria-label="Fechar" onClick={() => setOpen(false)}>✕</button>
        </div>

        <nav className="navList">
          {items.map((it) => (
            <a key={it.href} href={it.href} className="navItem" onClick={() => setOpen(false)}>
              <span>{it.label}</span><span className="chev">›</span>
            </a>
          ))}
        </nav>
      </aside>

      <div className="grid">
        <aside className="sidebar">
          <div className="navTitle">Menu</div>
          <nav className="navList">
            {items.map((it) => (
              <a key={it.href} href={it.href} className="navItem">
                <span>{it.label}</span><span className="chev">›</span>
              </a>
            ))}
          </nav>
        </aside>

        <main className="main">{children}</main>
      </div>
    </div>
  );
}