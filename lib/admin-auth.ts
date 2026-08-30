import { env } from "cloudflare:workers";

type HeaderReader = { get(name: string): string | null };
type AdminRuntimeEnv = { ADMIN_PASSWORD_SHA256?: string; ADMIN_SESSION_SECRET?: string };

export const ADMIN_COOKIE = "jiucai_admin_session";
const SESSION_SECONDS = 12 * 60 * 60;
const encoder = new TextEncoder();

function runtimeValue(key: keyof AdminRuntimeEnv) {
  const cloudflareValue = (env as unknown as AdminRuntimeEnv)[key];
  if (typeof cloudflareValue === "string" && cloudflareValue.trim()) return cloudflareValue.trim();
  return process.env[key]?.trim() || null;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sessionKey() {
  const secret = runtimeValue("ADMIN_SESSION_SECRET");
  if (!secret) return null;
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

function cookieValue(headers: HeaderReader) {
  const cookie = headers.get("cookie") || "";
  const pair = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${ADMIN_COOKIE}=`));
  return pair?.slice(ADMIN_COOKIE.length + 1) || null;
}

export async function verifyAdminPassword(password: string) {
  const expected = runtimeValue("ADMIN_PASSWORD_SHA256")?.toLowerCase();
  if (!expected || !/^[0-9a-f]{64}$/.test(expected)) return false;
  const actual = await sha256(password);
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= expected.charCodeAt(index) ^ actual.charCodeAt(index);
  return difference === 0;
}

export async function createAdminSession() {
  const key = await sessionKey();
  if (!key) throw new Error("ADMIN_SESSION_SECRET is not configured");
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const nonce = toBase64Url(crypto.getRandomValues(new Uint8Array(18)));
  const payload = `${expiresAt}.${nonce}`;
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

export function adminSessionCookie(token: string) {
  return `${ADMIN_COOKIE}=${token}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearAdminSessionCookie() {
  return `${ADMIN_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

export async function isAnalyticsAdmin(headers: HeaderReader) {
  if (process.env.NODE_ENV !== "production") return true;
  const token = cookieValue(headers);
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expiresAt, nonce, signature] = parts;
  if (!/^\d+$/.test(expiresAt) || Number(expiresAt) <= Math.floor(Date.now() / 1000)) return false;
  if (!/^[A-Za-z0-9_-]+$/.test(nonce) || !/^[A-Za-z0-9_-]+$/.test(signature)) return false;
  const key = await sessionKey();
  if (!key) return false;
  const padded = signature.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(signature.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  return crypto.subtle.verify("HMAC", key, bytes, encoder.encode(`${expiresAt}.${nonce}`));
}
