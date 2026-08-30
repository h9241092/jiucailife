import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "匿名遊玩統計｜韭菜人生模擬器",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
