import Link from "next/link";
import { requireAthlete } from "@/src/lib/requireAthlete";
import ProfileSwitcher from "@/src/components/ProfileSwitcher"; // se não existir, troque por seu componente atual

export default async function AthleteLayout({ children }: { children: React.ReactNode }) {
  await requireAthlete();

  return (
    <div className="athWrap">
      <style>{`
        /* ====== Base / tokens ====== */
        :root{
          --bg: #f9fafb;
          --card: #ffffff;
          --border: #e5e7eb;
          --text: #111827;
          --muted: #6b7280;
          --shadow: 0 10px 30px rgba(17,24,39,.06);
          --radius: 14px;
          --sidebarW: 260px;
          --drawerW: 260px;
        }
        .athWrap{ min-height:100vh; background:var(--bg); color:var(--text); }

        /* ====== Header ====== */
        .athHeader{
          position: sticky; top:0; z-index:50;
          display:flex; align-items:center; gap:12px;
          padding: 12px 14px;
          background: rgba(255,255,255,.88);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--border);
        }
        .athBrand{ display:flex; align-items:center; gap:10px; min-width: 0; }
        .athLogo{ width: 28px; height: 28px; border-radius: 10px; overflow:hidden; display:flex; align-items:center; justify-content:center; }
        .athTitle{ display:flex; flex-direction:column; line-height:1.05; min-width:0; }
        .athTitle b{ font-size: 14px; letter-spacing:.2px; }
        .athTitle span{ font-size: 12px; color: var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

        .athRight{ margin-left:auto; display:flex; align-items:center; gap:10px; }

        .athHamburger{
          width: 42px; height: 42px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--card);
          display:inline-flex; align-items:center; justify-content:center;
          box-shadow: 0 1px 0 rgba(17,24,39,.02);
        }
        .athHamburger svg{ width:20px; height:20px; }

        /* ====== Desktop grid ====== */
        .athGrid{
          display:grid;
          grid-template-columns: var(--sidebarW) 1fr;
          gap: 16px;
          padding: 16px;
          max-width: 1100px;
          margin: 0 auto;
        }

        .athSidebar{
          border:1px solid var(--border);
          background: var(--card);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 12px;
          height: fit-content;
        }

        .athMain{
          min-width: 0;
        }

        .athNavTitle{ font-size: 12px; color: var(--muted); padding: 10px 10px 6px; }
        .athNav{ display:grid; gap:10px; }
        .athNav a{
          text-decoration:none; color: var(--text);
          border:1px solid var(--border);
          background: #fff;
          border-radius: 14px;
          padding: 12px 12px;
          font-weight: 600;
          display:flex; align-items:center; justify-content:space-between;
        }

        /* ====== Mobile drawer ====== */
        .athOverlay{
          position:fixed; inset:0; z-index:60;
          background: rgba(17,24,39,.45);
          display:none;
        }
        .athDrawer{
          position:fixed; top:0; left:0; z-index:70;
          width: var(--drawerW); max-width: 86vw;
          height: 100vh;
          background: var(--card);
          border-right: 1px solid var(--border);
          box-shadow: var(--shadow);
          transform: translateX(-105%);
          transition: transform .22s ease;
          padding: 14px;
          display:grid;
          grid-template-rows: auto 1fr;
          gap: 12px;
        }
        .athDrawerOpen{ transform: translateX(0); }
        .athDrawerHeader{ display:flex; align-items:center; justify-content:space-between; gap:10px; }
        .athClose{
          width: 40px; height: 40px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: #fff;
          display:inline-flex; align-items:center; justify-content:center;
        }

        /* ====== Responsividade: MOBILE FIRST ====== */
        /* Em touch/mobile: não existe sidebar desktop. */
        @media (hover: none) and (pointer: coarse) {
          .athGrid{ grid-template-columns: 1fr; padding: 12px; }
          .athSidebar{ display:none; }              /* <- chave para não duplicar */
          .athHamburger{ display:inline-flex; }     /* mostra ☰ */
        }

        /* Desktop real: mostra sidebar fixa e esconde ☰ (drawer continua existindo, mas invisível) */
        @media (min-width: 900px) and (hover: hover) and (pointer: fine) {
          .athHamburger{ display:none; }
          .athSidebar{ display:block; }
        }

        @media (max-width: 420px) {
          .athGrid{ padding: 10px; }
        }
      `}</style>

      <Header />

      <DesktopShell>{children}</DesktopShell>
    </div>
  );
}

function Header() {
  return (
    <div className="athHeader">
      {/* botão ☰ sempre renderiza, mas some via CSS no desktop */}
      <button className="athHamburger" type="button" aria-label="Abrir menu" onClick={() => {
        const drawer = document.getElementById("athDrawer");
        const overlay = document.getElementById("athOverlay");
        if (drawer) drawer.classList.add("athDrawerOpen");
        if (overlay) overlay.style.display = "block";
      }}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      <div className="athBrand">
        <div className="athLogo">
          {/* se você já tem logo no header, pode trocar por <img src="/endure_logo.png" .../> */}
          <img src="/endure_logo.png" alt="ENDURE" style={{ width: 28, height: 28 }} />
        </div>
        <div className="athTitle">
          <b>ENDURE</b>
          <span>Área do atleta</span>
        </div>
      </div>

      <div className="athRight">
        <ProfileSwitcher />
      </div>

      {/* overlay + drawer (mobile) */}
      <div id="athOverlay" className="athOverlay" onClick={() => {
        const drawer = document.getElementById("athDrawer");
        const overlay = document.getElementById("athOverlay");
        if (drawer) drawer.classList.remove("athDrawerOpen");
        if (overlay) overlay.style.display = "none";
      }} />

      <aside id="athDrawer" className="athDrawer" aria-label="Menu">
        <div className="athDrawerHeader">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/endure_logo.png" alt="ENDURE" style={{ width: 26, height: 26 }} />
            <div style={{ fontWeight: 700 }}>Menu</div>
          </div>
          <button className="athClose" type="button" aria-label="Fechar menu" onClick={() => {
            const drawer = document.getElementById("athDrawer");
            const overlay = document.getElementById("athOverlay");
            if (drawer) drawer.classList.remove("athDrawerOpen");
            if (overlay) overlay.style.display = "none";
          }}>
            ✕
          </button>
        </div>

        <NavLinks />
      </aside>
    </div>
  );
}

function DesktopShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="athGrid">
      {/* Sidebar desktop (no mobile fica display:none via CSS) */}
      <aside className="athSidebar" aria-label="Menu">
        <div className="athNavTitle">Menu</div>
        <NavLinks />
      </aside>

      <main className="athMain">{children}</main>
    </div>
  );
}

function NavLinks() {
  const items = [
    { href: "/athlete/dashboard", label: "Dashboard" },
    { href: "/athlete/pending", label: "Pendentes" },
    { href: "/athlete/history", label: "Histórico" },
  ];

  return (
    <nav className="athNav">
      {items.map((it) => (
        <Link key={it.href} href={it.href}>
          <span>{it.label}</span>
          <span style={{ color: "#9ca3af" }}>›</span>
        </Link>
      ))}
    </nav>
  );
}
