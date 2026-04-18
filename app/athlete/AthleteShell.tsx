"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AthleteProfileSwitcher from "@/src/components/AthleteProfileSwitcher";

function sectionTitle(pathname: string) {
  if (pathname.startsWith("/athlete/flow/")) return "Questionário";
  if (pathname.startsWith("/athlete/pending")) return "Pendentes";
  if (pathname.startsWith("/athlete/history")) return "Histórico";
  if (pathname.startsWith("/athlete/dashboard")) return "Dashboard";
  if (pathname.startsWith("/athlete/me")) return "Meus dados";
  return "Área do atleta";
}

export default function AthleteShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() || "";
  const title = useMemo(() => sectionTitle(pathname), [pathname]);

  useEffect(() => setOpen(false), [pathname]);

  const items = [
    { href: "/athlete/dashboard", label: "Dashboard" },
    { href: "/athlete/pending", label: "Pendentes" },
    { href: "/athlete/history", label: "Histórico" },
    { href: "/athlete/me", label: "Meus dados" },
  ];

  return (
    <div className="athApp">
      <style>{`
        :root{
          --bg:#f7f8fb;
          --card:#ffffff;
          --border:#e5e7eb;
          --text:#111827;
          --muted:#6b7280;
          --shadow:0 14px 40px rgba(17,24,39,.08);
          --radius:16px;
          --sidebarW:280px;
        }

        *{ box-sizing:border-box; }
        a{ color:inherit; text-decoration:none; }
        a:visited{ color:inherit; }

        /* app layout: footer no bottom */
        .athApp{
          min-height:100vh;
          display:flex;
          flex-direction:column;
          background:var(--bg);
          color:var(--text);
        }
        .athContent{ flex:1; }

        /* header */
        .athTop{
          position:sticky; top:0; z-index:50;
          background:rgba(255,255,255,.92);
          backdrop-filter: blur(12px);
          border-bottom:1px solid var(--border);
        }
        .athTopInner{
          width:100%;
          padding: 12px 14px;
          display:flex; align-items:center; justify-content:space-between;
          gap:12px;
        }
        .athLeft{ display:flex; align-items:center; gap:10px; min-width:0; }
        .athHamb{
          width:44px; height:44px;
          border-radius:14px;
          border:1px solid var(--border);
          background:#fff;
          display:none;
          align-items:center; justify-content:center;
        }
        .athHamb svg{ width:18px; height:18px; }

        .athBrand{ display:flex; align-items:center; gap:10px; min-width:0; }
        .athBrand img{ width:26px; height:26px; object-fit:contain; display:block; }
        .athBrandText{ display:flex; flex-direction:column; line-height:1.05; min-width:0; }
        .athBrandText strong{ font-size:14px; font-weight:900; letter-spacing:.6px; }
        .athBrandText span{ font-size:12px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

        /* mobile minimal: NÃO repetir título */
        @media (max-width:720px){
          .athHamb{ display:inline-flex; }
          .athBrandText span{ display:none; }
        }

        /* desktop layout */
        .athGrid{
          width:100%;
          display:grid;
          grid-template-columns: var(--sidebarW) 1fr;
          gap: 16px;
          padding: 16px 14px 18px;
        }
        .athSide{
          background:var(--card);
          border:1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 12px;
          height: fit-content;
          position: sticky;
          top: 86px;
          align-self:start;
        }
        .athMain{ min-width:0; }

        /* menu cards */
        .navTitle{ font-size:12px; color:var(--muted); padding: 8px 10px 6px; }
        .navList{ display:flex; flex-direction:column; gap:10px; }
        .navItem{
          border:1px solid var(--border);
          background:#fff;
          border-radius:14px;
          padding: 12px 12px;
          font-weight:700;
          min-height:44px;
          display:flex; align-items:center; justify-content:space-between;
        }
        .chev{ color:#9ca3af; font-size:18px; }

        @media (max-width:720px){
          .athGrid{ grid-template-columns:1fr; padding: 12px 12px 18px; }
          .athSide{ display:none; }
        }

        /* drawer mobile em FLEX (evita "quadrados gigantes") */
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
          display:flex;
          flex-direction:column;
          gap: 10px;
        }
        .drawerTop{
          display:flex; align-items:center; justify-content:space-between;
          gap:10px; padding: 2px 2px 6px;
        }
        .drawerTitle{ display:flex; align-items:center; gap:10px; font-weight:900; }
        .close{
          width:44px; height:44px;
          border-radius:14px;
          border:1px solid var(--border);
          background:#fff;
          display:inline-flex; align-items:center; justify-content:center;
          font-size:18px;
        }
        .drawerNav{ display:flex; flex-direction:column; gap:10px; }

        /* footer */
        .footer{
          margin-top:auto;
          border-top:1px solid var(--border);
          background: rgba(255,255,255,.9);
        }
        .footerInner{
          width:100%;
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
      `}</style>

      <header className="athTop">
        <div className="athTopInner">
          <div className="athLeft">
            <button className="athHamb" type="button" aria-label="Abrir menu" onClick={() => setOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            <Link href="/athlete/pending" className="athBrand">
              <img src="/endure_logo.png" alt="ENDURE" />
              <div className="athBrandText">
                <strong>ENDURE</strong>
                <span>{title}</span>
              </div>
            </Link>
          </div>

          <AthleteProfileSwitcher />
        </div>
      </header>

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

        <nav className="drawerNav">
          {items.map((it) => (
            <Link key={it.href} href={it.href} className="navItem" onClick={() => setOpen(false)}>
              <span>{it.label}</span><span className="chev">›</span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="athContent">
        <div className="athGrid">
          <aside className="athSide" aria-label="Menu">
            <div className="navTitle">Menu</div>
            <nav className="navList">
              {items.map((it) => (
                <Link key={it.href} href={it.href} className="navItem">
                  <span>{it.label}</span><span className="chev">›</span>
                </Link>
              ))}
            </nav>
          </aside>

          <main className="athMain">{children}</main>
        </div>
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