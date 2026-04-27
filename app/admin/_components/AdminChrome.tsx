"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/athletes", label: "Atletas" },
  { href: "/admin/assign/evaluation", label: "Designar avaliação" },
  { href: "/admin/assign/intervention", label: "Intervenções" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  function handleProfileChange(value: string) {
    if (value === "athlete") {
      router.push("/athlete/dashboard");
      return;
    }

    router.push("/admin/dashboard");
  }

  async function logout() {
    await supabaseBrowser.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="admin-chrome">
      <style>{`
        .admin-chrome {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(20,184,166,.10), transparent 30%),
            radial-gradient(circle at top right, rgba(249,115,22,.08), transparent 28%),
            #f8fafc;
          color: #0f172a;
        }

        .admin-frame {
          width: min(100%, 1560px);
          margin: 0 auto;
          display: grid;
          grid-template-columns: 292px minmax(0, 1fr);
          gap: 18px;
          padding: 16px;
          box-sizing: border-box;
        }

        .admin-sidebar {
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

        .admin-brand {
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

        .admin-logo-box {
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

        .admin-logo-box img {
          width: 96px;
          height: 48px;
          object-fit: contain;
          transform: none;
        }

        .admin-brand-title {
          display: none;
        }

        .admin-brand-subtitle {
          display: block;
          margin-top: 0;
          color: #64748b;
          font-size: 12.5px;
          font-weight: 800;
          line-height: 1.25;
          letter-spacing: .15px;
          text-align: center;
        }

        .admin-sidebar-label {
          margin: 12px 4px 9px;
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .45px;
          text-transform: uppercase;
        }

        .admin-nav {
          display: grid;
          gap: 8px;
        }

        .admin-nav-link {
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

        .admin-nav-link::after {
          content: "›";
          color: #94a3b8;
          font-size: 24px;
          line-height: 1;
        }

        .admin-nav-link.active {
          background: #111827;
          border-color: #111827;
          color: #ffffff;
          box-shadow: 0 16px 32px rgba(15,23,42,.16);
        }

        .admin-nav-link.active::after {
          color: #ffffff;
        }

        .admin-nav-link:not(.active):hover {
          border-color: #cbd5e1;
          transform: translateY(-1px);
        }

        .admin-sidebar-bottom {
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

        .admin-logout {
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

        .admin-mobilebar-wrap {
          display: none;
          position: sticky;
          top: 0;
          z-index: 40;
          padding: 10px 10px 0;
          background:
            linear-gradient(180deg, rgba(248,250,252,.98), rgba(248,250,252,.82) 72%, rgba(248,250,252,0));
          backdrop-filter: blur(10px);
        }

        .admin-mobilebar {
          display: grid;
          gap: 10px;
          padding: 11px;
          border-radius: 22px;
          background: rgba(255,255,255,.90);
          border: 1px solid rgba(226,232,240,.92);
          box-shadow: 0 18px 48px rgba(15,23,42,.08);
        }

        .admin-mobilebar-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .admin-mobile-nav {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .admin-mobile-nav .admin-nav-link {
          justify-content: center;
          min-height: 40px;
          padding: 0 8px;
          font-size: 12.5px;
        }

        .admin-mobile-nav .admin-nav-link::after {
          display: none;
        }

        .admin-main {
          min-width: 0;
        }

        .admin-content {
          min-height: calc(100vh - 130px);
        }

        .admin-footer {
          width: min(100%, 1180px);
          margin: 0 auto;
          padding: 24px 16px 30px;
          text-align: center;
          color: #64748b;
          font-size: 13px;
          line-height: 1.55;
          box-sizing: border-box;
        }

        .admin-footer-brand {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 8px;
          color: #0f172a;
          font-weight: 950;
          letter-spacing: .25px;
        }

        .admin-footer-line {
          width: 36px;
          height: 2px;
          border-radius: 999px;
          background: #0f172a;
          display: inline-block;
        }

        .admin-footer-author {
          margin-top: 2px;
          font-weight: 750;
        }

        @media (max-width: 1080px) {
          .admin-frame {
            grid-template-columns: 250px minmax(0, 1fr);
            gap: 12px;
          }

          .admin-sidebar {
            padding: 13px;
          }

          .admin-brand-subtitle {
          display: block;
          margin-top: 0;
          color: #64748b;
          font-size: 12.5px;
          font-weight: 800;
          line-height: 1.25;
          letter-spacing: .15px;
          text-align: center;
        }
        }

        @media (max-width: 860px) {
          .admin-frame {
            display: block;
            width: 100%;
            padding: 0;
          }

          .admin-sidebar {
            display: none;
          }

          .admin-mobilebar-wrap {
            display: block;
          }

          .admin-content {
            min-height: calc(100vh - 210px);
          }
        }

        @media (max-width: 560px) {
          .admin-mobilebar-top {
            align-items: flex-start;
            flex-direction: column;
          }

          .profile-select {
            height: 42px;
          }
        }
      `}</style>

      <div className="admin-mobilebar-wrap">
        <div className="admin-mobilebar">
          <div className="admin-mobilebar-top">
            <Link href="/admin/dashboard" className="admin-brand">
              <span className="admin-logo-box">
                <img src="/endure_logo.png" alt="ENDURE" />
              </span>

              <span style={{ minWidth: 0, display: "block", width: "100%" }}>
                <span className="admin-brand-title">ENDURE</span>
                <span className="admin-brand-subtitle">
                  Avaliação socioemocional
                </span>
              </span>
            </Link>

            <div style={{ display: "flex", gap: 8, width: "100%" }}>
              <select
                aria-label="Alternar perfil"
                value="admin"
                onChange={(e) => handleProfileChange(e.target.value)}
                className="profile-select"
              >
                <option value="admin">admin</option>
                <option value="athlete">athlete</option>
              </select>

              <button type="button" onClick={logout} className="admin-logout">
                Sair
              </button>
            </div>
          </div>

          <nav className="admin-mobile-nav" aria-label="Navegação administrativa">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive(pathname, item.href)
                    ? "admin-nav-link active"
                    : "admin-nav-link"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="admin-frame">
        <aside className="admin-sidebar">
          <Link href="/admin/dashboard" className="admin-brand">
            <span className="admin-logo-box">
              <img src="/endure_logo.png" alt="ENDURE" />
            </span>

            <span style={{ minWidth: 0 }}>
              <span className="admin-brand-title">ENDURE</span>
              <span className="admin-brand-subtitle">
                Avaliação socioemocional
              </span>
            </span>
          </Link>

          <div className="admin-sidebar-label">Menu</div>

          <nav className="admin-nav" aria-label="Navegação administrativa">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive(pathname, item.href)
                    ? "admin-nav-link active"
                    : "admin-nav-link"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="admin-sidebar-bottom">
            <div className="profile-control">
              <label className="profile-label">Perfil</label>

              <select
                aria-label="Alternar perfil"
                value="admin"
                onChange={(e) => handleProfileChange(e.target.value)}
                className="profile-select"
              >
                <option value="admin">admin</option>
                <option value="athlete">athlete</option>
              </select>
            </div>

            <button type="button" onClick={logout} className="admin-logout">
              Sair
            </button>
          </div>
        </aside>

        <div className="admin-main">
          <div className="admin-content">{children}</div>

          <footer className="admin-footer">
            <div className="admin-footer-brand">
              <span className="admin-footer-line" />
              <span>ENDURE</span>
              <span className="admin-footer-line" />
            </div>

            <div>Avaliação socioemocional para atletas de endurance</div>
            <div className="admin-footer-author">
              Prof. Dr. Nelson Hauck Filho
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}