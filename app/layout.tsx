import type { Metadata } from 'next';
import './globals.css';

const siteUrl = new URL('https://jiucai-life-simulator.mmrichdog.workers.dev');
const siteTitle = '韭菜人生模擬器｜JIU-CAI LIFE';
const siteDescription = '從三十萬元起始資金開始，體驗屬於你的市場人生。';

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: siteTitle,
  description: siteDescription,
  applicationName: 'JIU-CAI LIFE',
  alternates: { canonical: '/' },
  keywords: ['韭菜人生模擬器', 'JIU-CAI LIFE', '投資模擬遊戲', '人生模擬器'],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    title: siteTitle,
    description: '三十萬元起始資金，能撐過幾輪市場？',
    type: 'website',
    url: '/',
    siteName: '韭菜人生模擬器',
    locale: 'zh_TW',
    images: [{ url: '/og.png', width: 1536, height: 1024, alt: '韭菜人生模擬器' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: '三十萬元起始資金，能撐過幾輪市場？',
    images: ['/og.png'],
  },
  icons: { icon: '/favicon.svg' },
  verification: {
    google: 'f6Mt_S4Nxm9EWlGKnX1o46CSgTbC-yDg2z3yHVqUFKc',
  },
};

const websiteStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: '韭菜人生模擬器',
  alternateName: 'JIU-CAI LIFE',
  url: `${siteUrl}/`,
  description: siteDescription,
  inLanguage: 'zh-Hant-TW',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteStructuredData).replace(/</g, '\\u003c'),
          }}
        />
        {children}
      </body>
    </html>
  );
}
