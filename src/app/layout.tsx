import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '位置情報アプリ',
  description: 'Google Mapsを使用した位置情報アプリ',
  themeColor: '#000000',
  manifest: '/manifest.json',
  icons: {
    apple: '/icon-192x192.png',
  },
}

export default function RootLayout({
                                     children,
                                   }: {
  children: React.ReactNode
}) {
  return (
      <html lang="ja">
      <body>{children}</body>
      </html>
  )
}