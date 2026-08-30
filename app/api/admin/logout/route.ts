import { clearAdminSessionCookie } from "@/lib/admin-auth";

export async function POST() {
  return new Response(null, { status: 303, headers: { Location: "/admin/login", "Set-Cookie": clearAdminSessionCookie(), "Cache-Control": "no-store" } });
}
