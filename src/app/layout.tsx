import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bengkel Antrian",
  description: "Sistem antrian servis kendaraan bengkel",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full bg-slate-950 font-sans text-slate-100">
        {children}
      </body>
    </html>
  );
}
