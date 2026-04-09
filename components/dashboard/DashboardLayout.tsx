"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Activity,
  Shield,
  HardDrive,
  Stethoscope,
  Network,
  RefreshCw,
  LogOut,
  Menu,
  X,
  History,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardLayoutProps {
  children: React.ReactNode;
  onRefresh?: () => void;
  loading?: boolean;
}

const menuItems = [
  { id: "overview",    label: "Overview",    icon: LayoutDashboard, path: "/dashboard" },
  { id: "performance", label: "Performance", icon: Activity,        path: "/dashboard/performance" },
  { id: "interfaces",  label: "Interfaces",  icon: Network,         path: "/dashboard/interfaces" },
  { id: "security",    label: "Security",    icon: Shield,          path: "/dashboard/security" },
  { id: "hardware",    label: "Hardware",    icon: HardDrive,       path: "/dashboard/hardware" },
  { id: "diagnostics", label: "Diagnostics", icon: Stethoscope,     path: "/dashboard/diagnostics" },
  { id: "history",     label: "Historique",  icon: History,         path: "/dashboard/history" },
  { id: "alerts",      label: "Alertes",     icon: Bell,            path: "/dashboard/alerts" },
];

export default function DashboardLayout({
  children,
  onRefresh,
  loading = false,
}: DashboardLayoutProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeItem, setActiveItem] = useState("overview");

  const handleLogout = async () => {
    try {
      await fetch("/api/connect", { method: "DELETE" });
      router.push("/");
    } catch (err) {
      console.error("Erreur de déconnexion:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 256 : 80 }}
        className="glass border-r border-white/10 flex flex-col"
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-paloalto-blue/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-paloalto-blue" />
            </div>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <h1 className="text-xl font-bold bg-gradient-to-r from-paloalto-blue to-paloalto-orange bg-clip-text text-transparent">
                  PaloMalo
                </h1>
              </motion.div>
            )}
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveItem(item.id);
                  router.push(item.path);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? "bg-paloalto-blue/20 text-paloalto-blue"
                    : "hover:bg-white/5 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="font-medium">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <X className="w-5 h-5 mr-2" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
            {sidebarOpen && <span>Réduire</span>}
          </Button>
        </div>
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="glass border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Dashboard</h2>
              <p className="text-sm text-muted-foreground">
                Monitoring en temps réel
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Bouton Refresh */}
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
                className="glass-hover"
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Actualiser
              </Button>

              {/* Bouton Déconnexion */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="glass-hover"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
