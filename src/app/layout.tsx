import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import Link from "next/link"
import { Trophy, Swords, Users, ClipboardCheck, Home, LayoutGrid, ScanLine, Shield } from "lucide-react"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "足球比赛数据预测助手",
  description: "世界杯、欧洲杯、国际友谊赛数据分析和预测工具",
}

const navItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/matches", label: "赛程", icon: Swords },
  { href: "/groups", label: "小组", icon: LayoutGrid },
  { href: "/teams", label: "球队", icon: Users },
  { href: "/reviews", label: "复盘", icon: ClipboardCheck },
  { href: "/odds-ocr", label: "OCR", icon: ScanLine },
  { href: "/admin", label: "管理", icon: Shield },
]

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-muted/30">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
                <Trophy className="h-4 w-4" />
              </div>
              <span className="hidden sm:inline bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">2026 世界杯预测</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-6">{children}</div>
        </main>
        <footer className="border-t py-4 text-center text-xs text-muted-foreground">
          足球比赛数据预测助手 — 仅供娱乐参考，不构成任何投注建议
        </footer>
      </body>
    </html>
  )
}
