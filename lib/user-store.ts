/**
 * Gestion des utilisateurs locaux (data/users.json)
 * Mots de passe hashés avec bcrypt (cost factor 12)
 * Compte admin par défaut créé au premier démarrage : admin / PaloMalo@2024
 */
import { promises as fs } from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { AppUser, AppUserSafe, UserRole } from "@/types";

const USERS_FILE = path.join(process.cwd(), "data", "users.json");
const BCRYPT_ROUNDS = 12;

// ── Initialisation ────────────────────────────────────────────────────────────

async function ensureFile(): Promise<void> {
  try { await fs.access(USERS_FILE); }
  catch {
    await fs.mkdir(path.dirname(USERS_FILE), { recursive: true });
    // Créer l'admin par défaut
    const defaultAdmin: AppUser = {
      id:           "usr-default-admin",
      username:     "admin",
      email:        "admin@palomalo.local",
      passwordHash: await bcrypt.hash("PaloMalo@2024", BCRYPT_ROUNDS),
      role:         "admin",
      createdAt:    new Date().toISOString(),
      provider:     "credentials",
    };
    await fs.writeFile(USERS_FILE, JSON.stringify([defaultAdmin], null, 2), "utf-8");
  }
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function getAllUsers(): Promise<AppUser[]> {
  await ensureFile();
  return JSON.parse(await fs.readFile(USERS_FILE, "utf-8")) as AppUser[];
}

export async function getUserById(id: string): Promise<AppUser | null> {
  const all = await getAllUsers();
  return all.find(u => u.id === id) ?? null;
}

export async function getUserByUsername(username: string): Promise<AppUser | null> {
  const all = await getAllUsers();
  return all.find(u => u.username.toLowerCase() === username.toLowerCase()) ?? null;
}

export async function getUserByEmail(email: string): Promise<AppUser | null> {
  const all = await getAllUsers();
  return all.find(u => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function createUser(data: {
  username: string;
  email: string;
  password: string;
  role: UserRole;
}): Promise<AppUser> {
  const all = await getAllUsers();

  if (all.find(u => u.username.toLowerCase() === data.username.toLowerCase())) {
    throw new Error(`L'utilisateur "${data.username}" existe déjà.`);
  }
  if (all.find(u => u.email.toLowerCase() === data.email.toLowerCase())) {
    throw new Error(`L'email "${data.email}" est déjà utilisé.`);
  }

  const user: AppUser = {
    id:           `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    username:     data.username,
    email:        data.email,
    passwordHash: await bcrypt.hash(data.password, BCRYPT_ROUNDS),
    role:         data.role,
    createdAt:    new Date().toISOString(),
    provider:     "credentials",
  };

  all.push(user);
  await fs.writeFile(USERS_FILE, JSON.stringify(all, null, 2), "utf-8");
  return user;
}

export async function updateUser(id: string, patch: Partial<Pick<AppUser, "email" | "role">> & { password?: string }): Promise<AppUser | null> {
  const all = await getAllUsers();
  const idx = all.findIndex(u => u.id === id);
  if (idx === -1) return null;

  if (patch.email)    all[idx].email = patch.email;
  if (patch.role)     all[idx].role  = patch.role;
  if (patch.password) all[idx].passwordHash = await bcrypt.hash(patch.password, BCRYPT_ROUNDS);

  await fs.writeFile(USERS_FILE, JSON.stringify(all, null, 2), "utf-8");
  return all[idx];
}

export async function deleteUser(id: string): Promise<boolean> {
  const all = await getAllUsers();
  // Empêcher la suppression du dernier admin
  const admins = all.filter(u => u.role === "admin");
  const target = all.find(u => u.id === id);
  if (target?.role === "admin" && admins.length <= 1) {
    throw new Error("Impossible de supprimer le dernier administrateur.");
  }
  const filtered = all.filter(u => u.id !== id);
  if (filtered.length === all.length) return false;
  await fs.writeFile(USERS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
  return true;
}

export async function updateLastLogin(id: string): Promise<void> {
  const all = await getAllUsers();
  const user = all.find(u => u.id === id);
  if (user) {
    user.lastLoginAt = new Date().toISOString();
    await fs.writeFile(USERS_FILE, JSON.stringify(all, null, 2), "utf-8");
  }
}

// ── Utilitaires ───────────────────────────────────────────────────────────────

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function sanitizeUser(user: AppUser): AppUserSafe {
  const { passwordHash: _h, ...safe } = user;
  return safe;
}
