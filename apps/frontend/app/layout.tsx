// path: apps/frontend/app/layout.tsx
import type { Metadata } from 'next'
import { geistSans, geistMono } from './fonts'
import { ThemeProvider } from '@/app/providers/theme-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'DriveCare - CRM для автосервисов',
  description: 'Современная CRM система для управления автосервисом',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body 
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          defaultTheme="dark"
          storageKey="drivecare-ui-theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
