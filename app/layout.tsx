import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { QueryProvider } from '@/components/providers'
import { Toaster } from 'sonner'
import { IdleTimeoutProvider } from '@/components/shared/IdleTimeoutProvider'
import { ServiceWorkerRegister } from '@/components/shared/ServiceWorkerRegister'
import './globals.css'

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })

const siteConfig = {
  name: 'EduCore',
  description: 'A comprehensive multi-tenant school management system for administrators, teachers, students, and parents.',
  url: 'https://educore.com',
  ogImage: 'https://educore.com/og.jpg',
}

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} - School Management System`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: ['school management', 'education', 'attendance', 'grades', 'fees', 'learning management system'],
  authors: [{ name: 'EduCore' }],
  creator: 'EduCore',
  publisher: 'EduCore',
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} - School Management System`,
    description: siteConfig.description,
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: siteConfig.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name} - School Management System`,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  other: {
    'theme-color': '#1E40AF',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'EduCore',
    'msapplication-TileColor': '#1E40AF',
    'msapplication-TileImage': '/icons/icon-192.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1E40AF" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="EduCore" />
        <meta name="msapplication-TileColor" content="#1E40AF" />
        <meta name="msapplication-TileImage" content="/icons/icon-192.svg" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body className={inter.className}>
        <ServiceWorkerRegister />
        <QueryProvider>
          <IdleTimeoutProvider>
            {children}
            <Toaster richColors position="top-right" />
          </IdleTimeoutProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
