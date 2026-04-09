"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    url: "",
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur de connexion");
      }

      // Connexion réussie - Redirection vers le dashboard
      console.log("✅ Connexion réussie au firewall", formData.url);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl glass mb-4"
          >
            <Shield className="w-10 h-10 text-paloalto-blue" />
          </motion.div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-paloalto-blue to-paloalto-orange bg-clip-text text-transparent">
            PaloMalo
          </h1>
          <p className="text-muted-foreground mt-2">
            Dashboard Palo Alto Networks
          </p>
        </div>

        {/* Formulaire de connexion */}
        <Card className="glass border-white/10">
          <CardHeader>
            <CardTitle>Connexion au Firewall</CardTitle>
            <CardDescription>
              Connectez-vous à votre firewall Palo Alto Networks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* URL/IP */}
              <div className="space-y-2">
                <Label htmlFor="url">URL ou IP du Firewall</Label>
                <Input
                  id="url"
                  type="text"
                  placeholder="192.168.1.1 ou firewall.example.com"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                  required
                  disabled={loading}
                  className="glass-hover"
                />
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">Nom d&apos;utilisateur</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="admin"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  required
                  disabled={loading}
                  className="glass-hover"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  disabled={loading}
                  className="glass-hover"
                />
              </div>

              {/* Message d'erreur */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Bouton de connexion */}
              <Button
                type="submit"
                className="w-full bg-paloalto-blue hover:bg-paloalto-blue/90 text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Se connecter
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Vos identifiants sont sécurisés et ne sont jamais stockés côté client
        </p>
      </motion.div>
    </div>
  );
}
