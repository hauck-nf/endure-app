import type { Metadata } from "next";

// ✅ Meta padrão do app (pode ajustar depois)
export const metadata: Metadata = {
  title: "ENDURE",
  description: "Avaliação socioemocional em atletas",
};

// ✅ Viewport correto para mobile (resolve render “desktop” no celular)
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <head>
        {/* redundante, mas “à prova de navegador” */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body style={{ margin: 0, background: "#f9fafb" }}>
        {children}
      </body>
    </html>
  );
}
