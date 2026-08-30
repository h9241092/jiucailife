export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#070b13", color: "#eef3ff" }}>
    <form method="post" action="/api/admin/login" style={{ width: "min(420px, 100%)", padding: 28, border: "1px solid #263657", borderRadius: 18, background: "#111827" }}>
      <p style={{ color: "#51e3c2", margin: 0 }}>韭菜人生模擬器 · 製作人專用</p>
      <h1 style={{ fontSize: 30, margin: "10px 0 8px" }}>統計後台登入</h1>
      <p style={{ color: "#aebbd2", lineHeight: 1.7 }}>請輸入管理員密碼。登入狀態會保留 12 小時。</p>
      <label style={{ display: "grid", gap: 8, marginTop: 20 }}>管理員密碼
        <input name="password" type="password" required autoComplete="current-password" style={{ padding: "13px 14px", borderRadius: 10, border: "1px solid #344567", background: "#080d18", color: "white", fontSize: 17 }} />
      </label>
      {error ? <p role="alert" style={{ color: "#ff7b8e" }}>密碼不正確，請再試一次。</p> : null}
      <button type="submit" style={{ width: "100%", marginTop: 20, padding: 13, border: 0, borderRadius: 10, background: "#36d6b1", color: "#05110e", fontWeight: 800, fontSize: 17 }}>登入後台</button>
      <a href="/" style={{ display: "block", marginTop: 16, textAlign: "center", color: "#9fb0cc" }}>返回遊戲</a>
    </form>
  </main>;
}
