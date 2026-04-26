import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

type ButtonTone = "dark" | "light" | "danger" | "ghost" | "success";

export function PageShell({
  children,
  maxWidth = 1180,
}: {
  children: ReactNode;
  maxWidth?: number;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(20,184,166,.12), transparent 30%), radial-gradient(circle at top right, rgba(249,115,22,.10), transparent 28%), #f8fafc",
        color: "#0f172a",
        padding: 24,
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          width: "min(100%, var(--page-max))",
          maxWidth,
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        <style>{`
          @media (max-width: 640px) {
            main {
              padding: 12px !important;
            }
          }
        `}</style>
        {children}
      </div>
    </main>
  );
}

export function PremiumCard({
  children,
  style,
  className,
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <section
      className={className}
      style={{
        background: "rgba(255,255,255,.94)",
        border: "1px solid rgba(226,232,240,.92)",
        borderRadius: 28,
        padding: 22,
        boxShadow: "0 22px 60px rgba(15,23,42,.08)",
        backdropFilter: "blur(10px)",
        minWidth: 0,
        boxSizing: "border-box",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

export function HeroCard({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <PremiumCard
      style={{
        padding: 28,
        background: "linear-gradient(135deg, rgba(15,23,42,.97), rgba(30,41,59,.95))",
        color: "#fff",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -80,
          top: -80,
          width: 260,
          height: 260,
          borderRadius: 999,
          background: "rgba(20,184,166,.22)",
        }}
      />

      <div
        style={{
          position: "absolute",
          right: 120,
          bottom: -110,
          width: 260,
          height: 260,
          borderRadius: 999,
          background: "rgba(249,115,22,.18)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          justifyContent: "space-between",
          gap: 18,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0, maxWidth: 760 }}>
          {eyebrow ? (
            <p
              style={{
                margin: 0,
                color: "#99f6e4",
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: 0.6,
                textTransform: "uppercase",
              }}
            >
              {eyebrow}
            </p>
          ) : null}

          <h1
            style={{
              margin: "8px 0 0",
              fontSize: "clamp(30px, 5vw, 42px)",
              lineHeight: 1.05,
              letterSpacing: -1,
              color: "#fff",
            }}
          >
            {title}
          </h1>

          {subtitle ? (
            <p
              style={{
                margin: "12px 0 0",
                color: "#cbd5e1",
                lineHeight: 1.65,
                fontSize: 16,
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>

        {right ? <div>{right}</div> : null}
      </div>
    </PremiumCard>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      {eyebrow ? (
        <p
          style={{
            margin: 0,
            color: "#64748b",
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </p>
      ) : null}

      <h2
        style={{
          margin: eyebrow ? "6px 0 0" : 0,
          fontSize: "clamp(22px, 3.5vw, 30px)",
          lineHeight: 1.08,
          letterSpacing: -0.5,
          color: "#0f172a",
        }}
      >
        {title}
      </h2>

      {subtitle ? (
        <p style={{ margin: "9px 0 0", color: "#64748b", lineHeight: 1.55 }}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function buttonTokens(tone: ButtonTone, disabled?: boolean): CSSProperties {
  if (disabled) {
    return {
      border: "1px solid #e5e7eb",
      background: "#f8fafc",
      color: "#94a3b8",
      cursor: "not-allowed",
      opacity: 0.8,
    };
  }

  if (tone === "danger") {
    return {
      border: "1px solid #ef4444",
      background: "#ef4444",
      color: "#fff",
    };
  }

  if (tone === "success") {
    return {
      border: "1px solid #059669",
      background: "#059669",
      color: "#fff",
    };
  }

  if (tone === "light") {
    return {
      border: "1px solid #d1d5db",
      background: "#fff",
      color: "#111827",
    };
  }

  if (tone === "ghost") {
    return {
      border: "1px solid transparent",
      background: "transparent",
      color: "#111827",
    };
  }

  return {
    border: "1px solid #111827",
    background: "#111827",
    color: "#fff",
  };
}

export function PremiumButton({
  children,
  tone = "dark",
  disabled = false,
  onClick,
  type = "button",
  full = false,
  style,
}: {
  children: ReactNode;
  tone?: ButtonTone;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  full?: boolean;
  style?: CSSProperties;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 42,
        width: full ? "100%" : undefined,
        padding: "0 16px",
        borderRadius: 14,
        fontWeight: 900,
        fontSize: 14,
        fontFamily: "inherit",
        whiteSpace: "nowrap",
        textDecoration: "none",
        ...buttonTokens(tone, disabled),
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function PremiumLinkButton({
  children,
  href,
  tone = "dark",
  full = false,
  style,
}: {
  children: ReactNode;
  href: string;
  tone?: ButtonTone;
  full?: boolean;
  style?: CSSProperties;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 42,
        width: full ? "100%" : undefined,
        padding: "0 16px",
        borderRadius: 14,
        fontWeight: 900,
        fontSize: 14,
        fontFamily: "inherit",
        whiteSpace: "nowrap",
        textDecoration: "none",
        ...buttonTokens(tone, false),
        ...style,
      }}
    >
      {children}
    </Link>
  );
}

export function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "green" | "amber" | "blue" | "red" | "neutral";
}) {
  const palette = {
    green: { bg: "#ecfdf5", border: "#a7f3d0", color: "#065f46" },
    amber: { bg: "#fffbeb", border: "#fde68a", color: "#92400e" },
    blue: { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
    red: { bg: "#fef2f2", border: "#fecaca", color: "#991b1b" },
    neutral: { bg: "#f8fafc", border: "#e5e7eb", color: "#475569" },
  }[tone];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 28,
        padding: "0 10px",
        borderRadius: 999,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.color,
        fontSize: 12,
        fontWeight: 900,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 18,
        border: "1px dashed #cbd5e1",
        background: "#f8fafc",
        color: "#64748b",
        fontWeight: 700,
      }}
    >
      {text}
    </div>
  );
}