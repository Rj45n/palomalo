"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppUserSafe, UserRole } from "@/types";
import {
  Users, Plus, Trash2, Edit3, X, Save, Shield, Eye, Wrench,
  CheckCircle, AlertCircle, RefreshCw, Key
} from "lucide-react";

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; icon: React.ElementType; desc: string }> = {
  admin:    { label: "Admin",    color: "bg-red-500/20 text-red-400 border-red-500/30",       icon: Shield,  desc: "Accès complet, gestion des utilisateurs" },
  operator: { label: "Operator", color: "bg-blue-500/20 text-blue-400 border-blue-500/30",    icon: Wrench,  desc: "Diagnostic, Fleet, lecture/écriture" },
  viewer:   { label: "Viewer",   color: "bg-gray-500/20 text-gray-400 border-gray-500/30",    icon: Eye,     desc: "Lecture seule" },
};

function RoleBadge({ role }: { role: UserRole }) {
  const cfg = ROLE_CONFIG[role];
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
      <cfg.icon className="w-3 h-3" />{cfg.label}
    </span>
  );
}

interface UserModalProps {
  initial?: Partial<AppUserSafe & { password: string }>;
  onClose: () => void;
  onSave: (data: { username: string; email: string; password: string; role: UserRole }) => Promise<void>;
  isEdit?: boolean;
}

function UserModal({ initial, onClose, onSave, isEdit }: UserModalProps) {
  const [form, setForm] = useState({
    username: initial?.username ?? "",
    email:    initial?.email    ?? "",
    password: "",
    role:     (initial?.role ?? "viewer") as UserRole,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEdit && !form.password) { setError("Le mot de passe est requis."); return; }
    setSaving(true);
    try { await onSave(form); }
    catch (err) { setError(err instanceof Error ? err.message : "Erreur"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="bg-gray-900 border-white/10 p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">{isEdit ? "Modifier l'utilisateur" : "Nouvel utilisateur"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {!isEdit && (
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nom d&apos;utilisateur *</label>
              <input
                type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                placeholder="jdupont" required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Email *</label>
            <input
              type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="j.dupont@example.com" required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Mot de passe {isEdit ? "(laisser vide pour ne pas changer)" : "*"}
            </label>
            <input
              type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder={isEdit ? "••••••••" : "Min. 8 caractères"} minLength={isEdit ? 0 : 8}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Rôle *</label>
            <div className="space-y-2">
              {(Object.entries(ROLE_CONFIG) as [UserRole, typeof ROLE_CONFIG[UserRole]][]).map(([role, cfg]) => (
                <label key={role} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${form.role === role ? "border-blue-500/50 bg-blue-500/10" : "border-white/10 hover:border-white/20"}`}>
                  <input type="radio" name="role" value={role} checked={form.role === role} onChange={() => setForm({ ...form, role })} className="mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <cfg.icon className="w-3.5 h-3.5" /> {cfg.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{cfg.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-red-400 text-sm flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Sauvegarde…</> : <><Save className="w-4 h-4 mr-2" />Sauvegarder</>}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers]       = useState<AppUserSafe[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [editUser, setEditUser] = useState<AppUserSafe | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  };

  const notify = (ok: boolean, msg: string) => {
    setFeedback({ ok, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const addUser = async (data: { username: string; email: string; password: string; role: UserRole }) => {
    const res = await fetch("/api/users", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    setShowAdd(false);
    await load();
    notify(true, "Utilisateur créé avec succès.");
  };

  const editUserFn = async (data: { username: string; email: string; password: string; role: UserRole }) => {
    if (!editUser) return;
    const patch: Record<string, string> = { email: data.email, role: data.role };
    if (data.password) patch.password = data.password;
    const res = await fetch(`/api/users/${editUser.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    setEditUser(null);
    await load();
    notify(true, "Utilisateur modifié.");
  };

  const deleteUserFn = async (id: string, username: string) => {
    if (!confirm(`Supprimer l'utilisateur "${username}" ?`)) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { notify(false, data.error); return; }
    await load();
    notify(true, "Utilisateur supprimé.");
  };

  useEffect(() => { load(); }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-400" /> Gestion des utilisateurs
            </h1>
            <p className="text-gray-400 text-sm mt-1">{users.length} utilisateur(s) · Accès réservé aux administrateurs</p>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nouvel utilisateur
          </Button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm border ${feedback.ok ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
            {feedback.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {feedback.msg}
          </div>
        )}

        {/* Rôles info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(Object.entries(ROLE_CONFIG) as [UserRole, typeof ROLE_CONFIG[UserRole]][]).map(([role, cfg]) => (
            <Card key={role} className="bg-white/5 border-white/10 p-4 flex items-start gap-3">
              <cfg.icon className="w-5 h-5 mt-0.5 text-gray-400 shrink-0" />
              <div>
                <div className="font-medium text-sm flex items-center gap-2">
                  {cfg.label} <RoleBadge role={role} />
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{cfg.desc}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card className="bg-white/5 border-white/10 overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-xs text-gray-500 uppercase">
                  <th className="text-left px-6 py-3">Utilisateur</th>
                  <th className="text-left px-6 py-3">Email</th>
                  <th className="text-left px-6 py-3">Rôle</th>
                  <th className="text-left px-6 py-3">Provider</th>
                  <th className="text-left px-6 py-3">Dernière connexion</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} className={`border-b border-white/5 hover:bg-white/[0.03] transition-colors ${i === users.length - 1 ? "border-b-0" : ""}`}>
                    <td className="px-6 py-4">
                      <div className="font-mono font-semibold text-sm">{u.username}</div>
                      <div className="text-xs text-gray-500">{u.id}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{u.email}</td>
                    <td className="px-6 py-4"><RoleBadge role={u.role} /></td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        {u.provider === "keycloak" ? <><Key className="w-3 h-3 text-orange-400" />Keycloak</> : <><Shield className="w-3 h-3" />Local</>}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("fr-FR") : "Jamais"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => setEditUser(u)} className="text-gray-400 hover:text-white">
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteUserFn(u.id, u.username)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* Info Keycloak */}
        <Card className="bg-orange-500/5 border-orange-500/20 p-4">
          <p className="text-sm text-orange-300 flex items-start gap-2">
            <Key className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              <strong>Intégration Keycloak / OAuth2 :</strong> Décommentez les variables <code className="bg-white/10 px-1 rounded text-xs">AUTH_KEYCLOAK_*</code> dans <code className="bg-white/10 px-1 rounded text-xs">.env.local</code> pour activer la connexion SSO.
              Les rôles Keycloak <code className="bg-white/10 px-1 rounded text-xs">palomalo-admin</code>, <code className="bg-white/10 px-1 rounded text-xs">palomalo-operator</code> sont automatiquement mappés.
            </span>
          </p>
        </Card>
      </div>

      {showAdd && <UserModal onClose={() => setShowAdd(false)} onSave={addUser} />}
      {editUser && (
        <UserModal
          initial={editUser}
          isEdit
          onClose={() => setEditUser(null)}
          onSave={editUserFn}
        />
      )}
    </DashboardLayout>
  );
}
