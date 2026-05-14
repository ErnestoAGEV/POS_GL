import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "POSGL Dashboard",
  description: "Panel de control del sistema punto de venta",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-pos-bg text-pos-text antialiased">{children}</body>
    </html>
  );
}
