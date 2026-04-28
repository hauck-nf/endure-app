"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";

const navItems = [
  { href: "/athlete/dashboard", label: "Dashboard" },
  { href: "/athlete/pending", label: "Pendentes" },
  { href: "/athlete/interventions", label: "Intervenções" },
  { href: "/athlete/history", label: "Histórico" },
  { href: "/athlete/me", label: "Meus dados" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AthleteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  function handleProfileChange(value: string) {
    if (value === "admin") {
      router.push("/admin/dashboard");
      return;
    }

    router.push("/athlete/dashboard");
  }

  async function logout() {
    await supabaseBrowser.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="athlete-chrome">
      <style>{`
        .athlete-chrome {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(20,184,166,.10), transparent 30%),
            radial-gradient(circle at top right, rgba(249,115,22,.08), transparent 28%),
            #f8fafc;
          color: #0f172a;
        }

        .athlete-frame {
          width: min(100%, 1560px);
          margin: 0 auto;
          display: grid;
          grid-template-columns: 292px minmax(0, 1fr);
          gap: 18px;
          padding: 16px;
          box-sizing: border-box;
        }

        .athlete-sidebar {
          position: sticky;
          top: 16px;
          height: calc(100vh - 32px);
          display: flex;
          flex-direction: column;
          border-radius: 30px;
          background: rgba(255,255,255,.90);
          border: 1px solid rgba(226,232,240,.92);
          box-shadow: 0 24px 70px rgba(15,23,42,.10);
          backdrop-filter: blur(12px);
          padding: 16px;
          box-sizing: border-box;
        }

        .athlete-brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-width: 0;
          width: 100%;
          text-decoration: none;
          color: #0f172a;
          padding: 8px 4px 18px;
          text-align: center;
        }

        .athlete-logo-box {
          width: 96px;
          height: 56px;
          border-radius: 0;
          display: grid;
          place-items: center;
          background: transparent;
          border: 0;
          box-shadow: none;
          flex: 0 0 auto;
          overflow: visible;
          margin: 0 auto;
        }

        .athlete-logo-box img {
          width: 96px;
          height: 48px;
          object-fit: contain;
          transform: none;
        }

        .athlete-brand-title {
          display: none;
        }

        .athlete-brand-subtitle {
          display: block;
          margin-top: 0;
          color: #64748b;
          font-size: 12.5px;
          font-weight: 800;
          line-height: 1.25;
          letter-spacing: .15px;
          text-align: center;
        }

        .athlete-sidebar-label {
          margin: 12px 4px 9px;
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .45px;
          text-transform: uppercase;
        }

        .athlete-nav {
          display: grid;
          gap: 8px;
        }

        .athlete-nav-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 46px;
          padding: 0 13px;
          border-radius: 15px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          color: #0f172a;
          text-decoration: none;
          font-size: 14px;
          font-weight: 900;
          white-space: nowrap;
          box-shadow: 0 8px 18px rgba(15,23,42,.035);
        }

        .athlete-nav-link::after {
          content: "›";
          color: #94a3b8;
          font-size: 24px;
          line-height: 1;
        }

        .athlete-nav-link.active {
          background: #111827;
          border-color: #111827;
          color: #ffffff;
          box-shadow: 0 16px 32px rgba(15,23,42,.16);
        }

        .athlete-nav-link.active::after {
          color: #ffffff;
        }

        .athlete-nav-link:not(.active):hover {
          border-color: #cbd5e1;
          transform: translateY(-1px);
        }

        .athlete-sidebar-bottom {
          margin-top: auto;
          display: grid;
          gap: 10px;
          padding-top: 16px;
        }

        .profile-control {
          display: grid;
          gap: 7px;
        }

        .profile-label {
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .35px;
          text-transform: uppercase;
        }

        .profile-select {
          width: 100%;
          height: 44px;
          border-radius: 15px;
          border: 1px solid #d1d5db;
          background: #ffffff;
          color: #0f172a;
          padding: 0 12px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 900;
          outline: none;
        }

        .athlete-logout {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 12px;
          border-radius: 15px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          color: #0f172a;
          font-family: inherit;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          white-space: nowrap;
        }

        .athlete-mobilebar-wrap {
          display: none;
          position: sticky;
          top: 0;
          z-index: 40;
          padding: 10px 10px 0;
          background:
            linear-gradient(180deg, rgba(248,250,252,.98), rgba(248,250,252,.82) 72%, rgba(248,250,252,0));
          backdrop-filter: blur(10px);
        }

        .athlete-mobilebar {
          display: grid;
          gap: 10px;
          padding: 11px;
          border-radius: 22px;
          background: rgba(255,255,255,.90);
          border: 1px solid rgba(226,232,240,.92);
          box-shadow: 0 18px 48px rgba(15,23,42,.08);
        }

        .athlete-mobilebar-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .athlete-mobile-nav {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .athlete-mobile-nav .athlete-nav-link {
          justify-content: center;
          min-height: 40px;
          padding: 0 8px;
          font-size: 12.5px;
        }

        .athlete-mobile-nav .athlete-nav-link::after {
          display: none;
        }

        .athlete-main {
          min-width: 0;
        }

        .athlete-content {
          min-height: calc(100vh - 130px);
        }

        .athlete-footer {
          width: min(100%, 1180px);
          margin: 0 auto;
          padding: 24px 16px 30px;
          text-align: center;
          color: #64748b;
          font-size: 13px;
          line-height: 1.55;
          box-sizing: border-box;
        }

        .athlete-footer-brand {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 8px;
          color: #0f172a;
          font-weight: 950;
          letter-spacing: .25px;
        }

        .athlete-footer-line {
          width: 36px;
          height: 2px;
          border-radius: 999px;
          background: #0f172a;
          display: inline-block;
        }

        .athlete-footer-author {
          margin-top: 2px;
          font-weight: 750;
        }

        @media (max-width: 1080px) {
          .athlete-frame {
            grid-template-columns: 250px minmax(0, 1fr);
            gap: 14px;
          }

          .athlete-sidebar {
            padding: 13px;
          }
        }

        @media (max-width: 860px) {
          .athlete-frame {
            display: block;
            width: 100%;
            padding: 0;
          }

          .athlete-sidebar {
            display: none;
          }

          .athlete-mobilebar-wrap {
            display: block;
          }

          .athlete-content {
            min-height: calc(100vh - 210px);
          }
        }

        @media (max-width: 560px) {
          .athlete-mobilebar-top {
            align-items: flex-start;
            flex-direction: column;
          }

          .profile-select {
            height: 42px;
          }
        }
      `}</style>

      <div className="athlete-mobilebar-wrap">
        <div className="athlete-mobilebar">
          <div className="athlete-mobilebar-top">
            <Link href="/athlete/dashboard" className="athlete-brand">
              <span className="athlete-logo-box">
                <img src="/endure_logo.png" alt="ENDURE" />
              </span>

              <span style={{ minWidth: 0, display: "block", width: "100%" }}>
                <span className="athlete-brand-title">ENDURE</span>
                <span className="athlete-brand-subtitle">
                  Avaliação socioemocional
                </span>
              </span>
            </Link>

            <div style={{ display: "flex", gap: 8, width: "100%" }}>
              <select
                aria-label="Alternar perfil"
                value="athlete"
                onChange={(e) => handleProfileChange(e.target.value)}
                className="profile-select"
              >
                <option value="athlete">athlete</option>
                <option value="admin">admin</option>
              </select>

              <button type="button" onClick={logout} className="athlete-logout">
                Sair
              </button>
            </div>
          </div>

          <nav className="athlete-mobile-nav" aria-label="Navegação do atleta">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive(pathname, item.href)
                    ? "athlete-nav-link active"
                    : "athlete-nav-link"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="athlete-frame">
        <aside className="athlete-sidebar">
          <Link href="/athlete/dashboard" className="athlete-brand">
            <span className="athlete-logo-box">
              <img src="/endure_logo.png" alt="ENDURE" />
            </span>

            <span style={{ minWidth: 0, display: "block", width: "100%" }}>
              <span className="athlete-brand-title">ENDURE</span>
              <span className="athlete-brand-subtitle">
                Avaliação socioemocional
              </span>
            </span>
          </Link>

          <div className="athlete-sidebar-label">Menu</div>

          <nav className="athlete-nav" aria-label="Navegação do atleta">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive(pathname, item.href)
                    ? "athlete-nav-link active"
                    : "athlete-nav-link"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="athlete-sidebar-bottom">
            <div className="profile-control">
              <label className="profile-label">Perfil</label>

              <select
                aria-label="Alternar perfil"
                value="athlete"
                onChange={(e) => handleProfileChange(e.target.value)}
                className="profile-select"
              >
                <option value="athlete">athlete</option>
                <option value="admin">admin</option>
              </select>
            </div>

            <button type="button" onClick={logout} className="athlete-logout">
              Sair
            </button>
          </div>
        </aside>

        <div className="athlete-main">
          <div className="athlete-content">{children}</div>

          <footer className="athlete-footer">
            <div className="athlete-footer-brand">
              <span className="athlete-footer-line" />
              <span>ENDURE</span>
              <span className="athlete-footer-line" />
            </div>

            <div>Avaliação socioemocional para atletas de endurance</div>
            <div className="athlete-footer-author">
              Prof. Dr. Nelson Hauck Filho
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}