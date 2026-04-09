import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PaloMalo - Palo Alto Networks Dashboard",
  description: "Dashboard de monitoring et diagnostic pour firewalls Palo Alto Networks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className={inter.className}>
        <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
          {/* Gradient background effects */}
          <div className="fixed inset-0 bg-gradient-to-br from-paloalto-blue/10 via-transparent to-paloalto-orange/10 pointer-events-none" />
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-paloalto-blue/20 via-transparent to-transparent pointer-events-none" />
          
          {/* Grid pattern overlay */}
          <div 
            className="fixed inset-0 opacity-[0.02] pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '50px 50px'
            }}
          />
          
          {/* Content */}
          <div className="relative z-10">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
