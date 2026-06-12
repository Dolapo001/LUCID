import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LUCID — Livestock Unified Clinical Intelligence Dashboard",
  description: "Explainable AI decision-support system for precision dairy farming in Nigeria. Sensor-based prediction of health and reproductive traits with SHAP explanation layer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
