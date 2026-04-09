"use client";
import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, User, Lock, LogIn, Key, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const KEYCLOAK_ENABLED = !!(
  process.env.NEXT_PUBLIC_KEYCLOAK_ENABLED === "true"
);

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get("callbackUrl") ?? "/dashboard";
  const errorParam   = searchParams.get("error");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(
    errorParam === "CredentialsSignin" ? "Identifiants incorrects." : errorParam ? "Erreur d'authentification." : ""
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Identifiants incorrects. Vérifiez votre nom d'utilisateur et mot de passe.");
      setLoading(false);
    } else {
      router.push(callbackUrl);
    }
  };

  const handleKeycloak = () => {
    signIn("keycloak", { callbackUrl });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-orange-900/10 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-800/20 via-transparent to-transparent pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 mb-4 shadow-lg shadow-blue-500/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">PaloMalo</h1>
          <p className="text-gray-400 mt-1 text-sm">Diagnostic & Monitoring Palo Alto Networks</p>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-6">Connexion</h2>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-5 text-red-400 text-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 flex items-center gap-1">
                <User className="w-3 h-3" /> Nom d&apos;utilisateur
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
            </div>

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connexion…</>
                : <><LogIn className="w-4 h-4 mr-2" />Se connecter</>
              }
            </Button>
          </form>

          {/* Séparateur Keycloak */}
          {KEYCLOAK_ENABLED && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-gray-500">ou</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              <Button
                variant="outline"
                className="w-full border-white/10 hover:bg-white/5"
                onClick={handleKeycloak}
              >
                <Key className="w-4 h-4 mr-2 text-orange-400" />
                Se connecter avec Keycloak
              </Button>
            </>
          )}

          <p className="text-xs text-gray-600 text-center mt-6">
            Compte par défaut : <span className="text-gray-400 font-mono">admin</span> / <span className="text-gray-400 font-mono">PaloMalo@2024</span>
          </p>
        </Card>

        <p className="text-center text-xs text-gray-600 mt-4">
          PaloMalo v2.0 · Palo Alto Networks Diagnostic Platform
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
