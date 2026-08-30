import { adminSessionCookie, createAdminSession, verifyAdminPassword } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") || "");
  if (!await verifyAdminPassword(password)) return Response.redirect(new URL("/admin/login?error=1", request.url), 303);
  const token = await createAdminSession();
  return new Response(null, { status: 303, headers: { Location: "/admin", "Set-Cookie": adminSessionCookie(token), "Cache-Control": "no-store" } });
}
