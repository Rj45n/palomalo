"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Activity, Shield, HardDrive, Stethoscope,
  Network, RefreshCw, LogOut, Menu, X, History, Bell, Server,
  Users, ChevronDown, Wrench, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/types";

interface DashboardLayoutProps {
  children: React.ReactNode;
  onRefresh?: () => void;
  loading?: boolean;
}

const ROLE_BADGE: Record<UserRole, { label: string; color: string }> = {
  admin:    { label: "Admin",    color: "bg-red-500/20 text-red-400" },
  operator: { label: "Operator", color: "bg-blue-500/20 text-blue-400" },
  viewer:   { label: "Viewer",   color: "bg-gray-500/20 text-gray-400" },
};

const menuItems = [
  { id: "overview",    label: "Overview",    icon: LayoutDashboard, path: "/dashboard",             minRole: "viewer" },
  { id: "fleet",       label: "Fleet",       icon: Server,          path: "/dashboard/fleet",       minRole: "viewer" },
  { id: "performance", label: "Performance", icon: Activity,        path: "/dashboard/performance", minRole: "viewer" },
  { id: "interfaces",  label: "Interfaces",  icon: Network,         path: "/dashboard/interfaces",  minRole: "viewer" },
  { id: "security",    label: "Security",    icon: Shield,          path: "/dashboard/security",    minRole: "viewer" },
  { id: "hardware",    label: "Hardware",    icon: HardDrive,       path: "/dashboard/hardware",    minRole: "viewer" },
  { id: "diagnostics", label: "Diagnostics", icon: Stethoscope,     path: "/dashboard/diagnostics", minRole: "operator" },
  { id: "history",     label: "Historique",  icon: History,         path: "/dashboard/history",     minRole: "viewer" },
  { id: "alerts",      label: "Alertes",     icon: Bell,            path: "/dashboard/alerts",      minRole: "operator" },
  { id: "users",       label: "Utilisateurs", icon: Users,          path: "/dashboard/users",       minRole: "admin" },
] as const;

function roleWeight(role: UserRole): number {
  return role === "admin" ? 3 : role === "operator" ? 2 : 1;
}

export default function DashboardLayout({ children, onRefresh, loading = false }: DashboardLayoutProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  const role = (session?.user?.role ?? "viewer") as UserRole;
  const roleBadge = ROLE_BADGE[role];

  // Détecter l'item actif depuis l'URL
  const activeId = menuItems.slice().reverse().find(item => pathname.startsWith(item.path))?.id ?? "overview";

  const handleLogout = async () => {
    // Déconnecter PAN-OS ET NextAuth
    await fetch("/api/connect", { method: "DELETE" }).catch(() => {});
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 256 : 80 }}
        className="glass border-r border-white/10 flex flex-col shrink-0"
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-paloalto-blue/20 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6 text-paloalto-blue" />
            </div>
            {sidebarOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h1 className="text-xl font-bold bg-gradient-to-r from-paloalto-blue to-paloalto-orange bg-clip-text text-transparent">
                  PaloMalo
                </h1>
              </motion.div>
            )}
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            // Masquer les items selon le rôle
            if (roleWeight(role) < roleWeight(item.minRole as UserRole)) return null;

            const Icon = item.icon;
            const isActive = activeId === item.id;

            return (
              <button
                key={item.id}
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? "bg-paloalto-blue/20 text-paloalto-blue"
                    : "hover:bg-white/5 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Profil utilisateur */}
        {session && (
          <div className="p-4 border-t border-white/10">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {(session.user?.name ?? "?")[0].toUpperCase()}
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-sm font-medium truncate">{session.user?.name}</div>
                  <div className={`text-xs px-1.5 py-0.5 rounded inline-block mt-0.5 ${roleBadge.color}`}>
                    {roleBadge.label}
                  </div>
                </div>
              )}
              {sidebarOpen && <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${profileOpen ? "rotate-180" : ""}`} />}
            </button>

            {profileOpen && sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-2 space-y-1"
              >
                <div className="px-3 py-1 text-xs text-gray-500 truncate">{session.user?.email}</div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <LogOut className="w-4 h-4" /> Déconnexion
                </button>
              </motion.div>
            )}
          </div>
        )}

        {/* Toggle sidebar */}
        <div className="p-4 border-t border-white/10">
          <Button variant="ghost" className="w-full justify-start" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <><X className="w-5 h-5 mr-2" /><span>Réduire</span></> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="glass border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Dashboard</h2>
              <p className="text-sm text-muted-foreground">Monitoring en temps réel</p>
            </div>
            <div className="flex items-center gap-3">
              {onRefresh && (
                <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading} className="glass-hover">
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Actualiser
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleLogout} className="glass-hover">
                <LogOut className="w-4 h-4 mr-2" /> Déconnexion
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
