export default function AdminMenu() {
  const items = [
    { href: "/admin/athletes", label: "Meus atletas" },
    { href: "/admin/assign/evaluation", label: "Designar avaliação" },
    { href: "/admin/assign/intervention", label: "Designar tarefa socioemocional" },
  ];

  return (
    <nav style={{ display: "grid", gap: 8 }}>
      {items.map((it) => (
        <a
          key={it.href}
          href={it.href}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #222",
            textDecoration: "none",
            color: "inherit",
            fontWeight: 700,
          }}
        >
          {it.label}
        </a>
      ))}
    </nav>
  );
}
