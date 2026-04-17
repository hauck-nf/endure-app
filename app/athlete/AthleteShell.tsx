"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ProfileSwitcher from "@/src/components/ProfileSwitcher";

export default function AthleteShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  const items = [
    { href: "/athlete/dashboard", label: "Dashboard" },
    { href: "/athlete/pending", label: "Pendentes" },
    { href: "/athlete/history", label: "Histórico" },
  ];

  return (
    <div className="athWrap">
      <style>{`
        :root{
          --bg:#f9fafb; --card:#fff; --border:#e5e7eb;
          --text:#111827; --muted:#6b7280;
          --shadow:0 14px 40px rgba(17,24,39,.08);
          --radius:14px; --sidebarW:260px; --drawerW:280px;
        }
        .athWrap{ min-height:100vh; background:var(--bg); color:var(--text); }

        /* Header compacto */
        .athHeader{
          position: sticky; top:0; z-index:50;
          display:grid;
          grid-template-columns: 40px 1fr auto;
          align-items:center;
          gap: 10px;
          padding: 10px 12px;
          background: rgba(255,255,255,.92);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
        }
        .athHamburger{
          width: 36px; height: 36px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: #fff;
          display:inline-flex; align-items:center; justify-content:center;
        }
        .athHamburger svg{ width:18px; height:18px; }

        .athBrand{ display:flex; align-items:center; gap:10px; min-width:0; }
        .athLogo{ width:22px; height:22px; display:flex; align-items:center; justify-content:center; }
        .athLogo img{ width:22px; height:22px; object-fit:contain; display:block; }
        .athTitle{ display:flex; flex-direction:column; line-height:1.05; min-width:0; }
        .athTitle b{ font-size:14px; letter-spacing:.6px; font-weight:800; }
        .athTitle span{ font-size:12px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .athRight{ display:flex; align-items:center; justify-content:flex-end; gap:10px; }

        /* Layout */
        .athGrid{
          display:grid;
          grid-template-columns: var(--sidebarW) 1fr;
          gap:16px;
          padding:16px;
          max-width:1100px;
          margin:0 auto;
        }
        .athSidebar{
          border:1px solid var(--border);
          background:var(--card);
          border-radius:var(--radius);
          box-shadow:var(--shadow);
          padding:12px;
          height: fit-content;
        }
        .athMain{ min-width:0; }
        .athNavTitle{ font-size:12px; color:var(--muted); padding:8px 10px 6px; }
        .athNavCards{ display:grid; gap:10px; }
        .athNavCards a{
          text-decoration:none; color:var(--text);
          border:1px solid var(--border);
          background:#fff;
          border-radius:14px;
          padding:12px 12px;
          font-weight:650;
          display:flex; align-items:center; justify-content:space-between;
        }

        /* Drawer mobile compacto */
        .athOverlay{ position:fixed; inset:0; z-index:60; background:rgba(17,24,39,.45); display:${open ? "block" : "none"}; }
        .athDrawer{
          position:fixed; top:0; left:0; z-index:70;
          width: var(--drawerW); max-width:86vw;
          height:100vh;
          background:var(--card);
          border-right:1px solid var(--border);
          box-shadow:var(--shadow);
          transform: translateX(${open ? "0" : "-105%"});
          transition: transform .22s ease;
          padding:12px;
          display:grid;
          grid-template-rows:auto 1fr;
          gap:10px;
        }
        .athDrawerTop{ display:flex; align-items:center; justify-content:space-between; gap:10px; padding:2px 2px 6px; }
        .athDrawerTitle{ display:flex; align-items:center; gap:10px; font-weight:800; }
        .athClose{ width:38px; height:38px; border-radius:12px; border:1px solid var(--border); background:#fff; display:inline-flex; align-items:center; justify-content:center; font-size:18px; }

        .athNavList{ display:flex; flex-direction:column; gap:6px; border:none; background:transparent; }
        .athNavItem{
          display:flex; align-items:center; justify-content:space-between;
          padding:12px 12px;
          text-decoration:none;
          color:var(--text);
          font-weight:700;
          font-size:15px;
          border:1px solid var(--border);
          background:#fff;
          border-radius:14px;
        }
        .athNavItem span:last-child{ color:#9ca3af; font-size:18px; }

        @media (max-width: 899px) {
          .athGrid{ grid-template-columns:1fr; padding:12px; }
          .athSidebar{ display:none; }
          .athTitle span{ display:none; }
        }
        @media (min-width: 900px) {
          .athHamburger{ display:none; }
          .athOverlay{ display:none; }
          .athDrawer{ display:none; }
        }
      `}</style>

      <header className="athHeader">
        <button className="athHamburger" type="button" aria-label="Abrir menu" onClick={() => setOpen(true)}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="athBrand">
          <div className="athLogo"><img src="/endure_logo.png" alt="ENDURE" /></div>
          <div className="athTitle"><b>ENDURE</b><span>Área do atleta</span></div>
        </div>

        <div className="athRight"><ProfileSwitcher /></div>
      </header>

      <div className="athOverlay" onClick={() => setOpen(false)} />
      <aside className="athDrawer" aria-label="Menu">
        <div className="athDrawerTop">
          <div className="athDrawerTitle"><div className="athLogo"><img src="/endure_logo.png" alt="ENDURE" /></div><div>Menu</div></div>
          <button className="athClose" type="button" aria-label="Fechar" onClick={() => setOpen(false)}>✕</button>
        </div>
        <nav className="athNavList">
          {items.map((it) => (
            <Link key={it.href} href={it.href} className="athNavItem">
              <span>{it.label}</span><span>›</span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="athGrid">
        <aside className="athSidebar" aria-label="Menu">
          <div className="athNavTitle">Menu</div>
          <nav className="athNavCards">
            {items.map((it) => (
              <Link key={it.href} href={it.href}>
                <span>{it.label}</span><span style={{ color: "#9ca3af" }}>›</span>
              </Link>
            ))}
          </nav>
        </aside>
        <main className="athMain">{children}</main>
      </div>

    </div>
  );
}
