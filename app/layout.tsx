// app/layout.tsx
import type { Metadata } from 'next'
// import font nếu có, ví dụ: import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from "@/components/ui/toaster" // Nếu bạn dùng Toaster

// const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AnVie Spa Dashboard',
  description: 'Sales Chatbot Dashboard',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {/* Đây là nơi ứng dụng được render */}
        {children}
        <Toaster />
      </body>
    </html>
  )
}