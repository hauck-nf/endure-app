"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import RoleSwitcher from "@/app/_components/RoleSwitcher";

const items = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/athletes", label: "Meus atletas" },
  { href: "/admin/assign/evaluation", label: "Designar avaliação" },
];

function sectionTitle(pathname: string) {
  if (pathname.startsWith("/admin/assign/evaluation")) return "Designar avaliação";
  if (pathname.startsWith("/admin/athletes")) return "Meus atletas";
  if (pathname.startsWith("/admin/dashboard")) return "Dashboard";
  if (pathname.startsWith("/admin")) return "Admin";
  return "ENDURE";
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const title = useMemo(() => sectionTitle(pathname || ""), [pathname]);

  return (
    <div className="shell">
      <style>{`
        :root{
          --bg:#f7f8fb;
          --card:#ffffff;
          --border:#e5e7eb;
          --text:#111827;
          --muted:#6b7280;
          --action:#111827;
          --shadow:0 14px 40px rgba(17,24,39,.08);
          --radius:16px;
          --sidebarW:280px;
          --maxW:1180px;
        }

        *{ box-sizing:border-box; }
        .shell{ min-height:100vh; background:var(--bg); color:var(--text); }

        /* topbar */
        .topbar{
          position: sticky; top:0; z-index:40;
          background: rgba(255,255,255,.92);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
        }
        .topbarInner{
          max-width: var(--maxW);
          margin: 0 auto;
          padding: 12px 14px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 12px;
        }
        .leftCluster{ display:flex; align-items:center; gap:10px; min-width:0; }

        .hamb{
          width:44px; height:44px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: #fff;
          display:none;
          align-items:center; justify-content:center;
        }
        .hamb svg{ width:18px; height:18px; }

        .brand{
          display:flex; align-items:center; gap:10px;
          text-decoration:none; color:inherit;
          min-width:0;
        }
        .brand img{ width:26px; height:26px; object-fit:contain; display:block; }
        .brandText{ display:flex; flex-direction:column; line-height:1.05; min-width:0; }
        .brandText strong{ letter-spacing:.6px; font-size:14px; font-weight:900; }
        .brandText span{
          font-size:12px; color:var(--muted);
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
          max-width: 44vw;
        }

        /* layout desktop */
        .page{
          max-width: var(--maxW);
          margin: 0 auto;
          padding: 16px 14px 22px;
          display:grid;
          grid-template-columns: var(--sidebarW) 1fr;
          gap: 16px;
        }
        .sidebar{
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 12px;
          height: fit-content;
          position: sticky;
          top: 86px;
        }
        .main{ min-width:0; }

        /* nav cards */
        .navTitle{ font-size:12px; color:var(--muted); padding: 8px 10px 6px; }
        .navList{ display:grid; gap:10px; }
        .navItem{
          text-decoration:none; color:var(--text);
          border:1px solid var(--border);
          background:#fff;
          border-radius:14px;
          padding: 12px 12px;
          font-weight:700;
          display:flex; align-items:center; justify-content:space-between;
          min-height:44px;
        }
        .navItem:hover{ background:#f9fafb; }
        .chev{ color:#9ca3af; font-size:18px; }

        /* drawer mobile */
        .overlay{
          position:fixed; inset:0; z-index:60;
          background: rgba(17,24,39,.45);
          display: none;
        }
        .drawer{
          position:fixed; top:0; left:0; z-index:70;
          width: 320px; max-width: 86vw; height: 100vh;
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
          gap: 10px; padding: 2px 2px 6px;
        }
        .drawerTitle{ display:flex; align-items:center; gap:10px; font-weight:900; }
        .close{
          width:44px; height:44px;
          border-radius:14px;
          border: 1px solid var(--border);
          background:#fff;
          font-size: 18px;
          display:inline-flex; align-items:center; justify-content:center;
        }

        /* footer */
        .footer{
          border-top: 1px solid var(--border);
          background: rgba(255,255,255,.9);
        }
        .footerInner{
          max-width: var(--maxW);
          margin: 0 auto;
          padding: 14px 14px;
          display:flex;
          gap: 12px;
          align-items:center;
          justify-content:space-between;
          flex-wrap:wrap;
        }
        .footLeft{ display:flex; align-items:center; gap:10px; color:var(--muted); font-size:12px; }
        .footLeft img{ width:18px; height:18px; object-fit:contain; }
        .footRight{ color:var(--muted); font-size:12px; }

        @media (max-width: 720px){
          .hamb{ display:inline-flex; }
          .page{ grid-template-columns: 1fr; padding: 12px 12px 18px; }
          .sidebar{ display:none; }
        }
      `}</style>

      <div className="topbar">
        <div className="topbarInner">
          <div className="leftCluster">
            <button className="hamb" type="button" aria-label="Abrir menu" onClick={() => setOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            <a href="/admin/dashboard" className="brand">
              <img src="/endure_logo.png" alt="ENDURE" />
              <div className="brandText">
                <strong>ENDURE</strong>
                <span>{title}</span>
              </div>
            </a>
          </div>

          <RoleSwitcher />
        </div>
      </div>

      {/* Drawer mobile */}
      <div className="overlay" style={{ display: open ? "block" : "none" }} onClick={() => setOpen(false)} />
      <aside className="drawer" style={{ transform: open ? "translateX(0)" : "translateX(-105%)" }} aria-label="Menu">
        <div className="drawerTop">
          <div className="drawerTitle">
            <img src="/endure_logo.png" alt="ENDURE" style={{ width: 18, height: 18, objectFit: "contain" }} />
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

      <div className="page">
        <aside className="sidebar" aria-label="Menu">
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

      <footer className="footer">
        <div className="footerInner">
          <div className="footLeft">
            <img src="/endure_logo.png" alt="ENDURE" />
            <div>Endure — Avaliação socioemocional para atletas</div>
          </div>
          <div className="footRight">Prof. Dr. Nelson Hauck Filho • Contato: hauck.nf@gmail.com</div>
        </div>
      </footer>
    </div>
  );
}