import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Costeador de Canastas Navideñas",
  description: "Del formulario al Excel en un clic",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
