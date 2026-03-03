import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import QueryProvider from '@/components/providers/QueryProvider'
import { ToastProvider } from '@/components/ui/toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DevMetrics - AI-Powered Developer Analytics',
  description: 'Analyze your development team productivity with AI-powered insights',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
