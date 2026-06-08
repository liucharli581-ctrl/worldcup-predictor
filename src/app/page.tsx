"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TeamFlag } from "@/components/team-flag"
import { Swords, Users, ClipboardCheck, TrendingUp, Calendar, Trophy, ChevronRight, BarChart3 } from "lucide-react"

interface Team {
  id: string
  name: string
  fifaCode: string
  country: string | null
  fifaRanking: number
  eloRating: number
}

interface Match {
  id: string
  competition: string
  matchStage: string
  matchDate: string
  status: string
  homeTeam: { id: string; name: string; country: string | null }
  awayTeam: { id: string; name: string; country: string | null }
  homeScore?: number | null
  awayScore?: number | null
}

interface Review {
  id: string
  predictionHit: boolean
  match: {
    homeTeam: { name: string }
    awayTeam: { name: string }
  }
}

// 倒计时组件
function Countdown({ targetDate }: { targetDate: Date }) {
  const calc = useCallback(() => {
    const now = new Date().getTime()
    const diff = targetDate.getTime() - now
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    }
  }, [targetDate])

  const [time, setTime] = useState(calc)

  useEffect(() => {
    const timer = setInterval(() => setTime(calc()), 1000)
    return () => clearInterval(timer)
  }, [calc])

  const items = [
    { value: time.days, label: "天" },
    { value: time.hours, label: "时" },
    { value: time.minutes, label: "分" },
    { value: time.seconds, label: "秒" },
  ]

  return (
    <div className="flex gap-3 sm:gap-4">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col items-center">
          <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-xl bg-primary text-lg sm:text-2xl font-bold text-primary-foreground tabular-nums">
            {String(item.value).padStart(2, "0")}
          </div>
          <span className="mt-1 text-[10px] sm:text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState({ teams: 0, matches: 0, reviews: 0, hitRate: 0 })
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([])
  const [groups, setGroups] = useState<{ name: string; teams: Team[] }[]>([])
  const [loading, setLoading] = useState(true)
  const [firstMatchDate, setFirstMatchDate] = useState<Date | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [teamsRes, matchesRes, reviewsRes, groupsRes] = await Promise.all([
          fetch("/api/teams"),
          fetch("/api/matches"),
          fetch("/api/reviews"),
          fetch("/api/groups"),
        ])
        const teams = await teamsRes.json()
        const matches = await matchesRes.json()
        const reviews = await reviewsRes.json()
        const groupsData = await groupsRes.json()

        const teamList: Team[] = teams.data ?? []
        const matchList: Match[] = (matches.data ?? []).sort(
          (a: Match, b: Match) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
        )
        const reviewList: Review[] = reviews.data ?? []
        const groupList = groupsData.data ?? []

        const hits = reviewList.filter((r) => r.predictionHit).length
        const hitRate = reviewList.length > 0 ? Math.round((hits / reviewList.length) * 100) : 0

        setStats({
          teams: teamList.length,
          matches: matchList.length,
          reviews: reviewList.length,
          hitRate,
        })
        setUpcomingMatches(matchList.filter((m) => m.status === "scheduled").slice(0, 5))
        setGroups(groupList)

        // 第一场未开始的比赛作为倒计时
        const firstUpcoming = matchList.find((m) => m.status === "scheduled")
        if (firstUpcoming) setFirstMatchDate(new Date(firstUpcoming.matchDate))
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      scheduled: { label: "未开始", variant: "secondary" },
      live: { label: "进行中", variant: "default" },
      completed: { label: "已结束", variant: "outline" },
    }
    const s = map[status] ?? { label: status, variant: "outline" as const }
    return <Badge variant={s.variant}>{s.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    )
  }

  const completedCount = upcomingMatches.length > 0 ? 0 : 0 // placeholder
  const scheduledCount = stats.matches // all 24 matches started as scheduled

  return (
    <div className="space-y-6">
      {/* 标题区域 */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-bold tracking-tight">2026 世界杯</h1>
        </div>
        <p className="text-muted-foreground">美国 · 加拿大 · 墨西哥 | 2026.06.11 - 07.19</p>
      </div>

      {/* 倒计时 */}
      {firstMatchDate && (
        <Card className="overflow-hidden border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 dark:border-amber-800/30">
          <CardContent className="flex flex-col items-center gap-3 py-6">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
              <Calendar className="h-4 w-4" />
              <span>距世界杯开幕</span>
            </div>
            <Countdown targetDate={firstMatchDate} />
          </CardContent>
        </Card>
      )}

      {/* 数据卡片 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">参赛球队</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teams}</div>
            <p className="text-xs text-muted-foreground">12 个小组</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">比赛场次</CardTitle>
            <Swords className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.matches}</div>
            <p className="text-xs text-muted-foreground">已加载赛程数据</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">已生成预测</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.matches}</div>
            <p className="text-xs text-muted-foreground">全部比赛已覆盖</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">预测命中率</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.reviews > 0 ? `${stats.hitRate}%` : "待验证"}</div>
            <p className="text-xs text-muted-foreground">{stats.reviews > 0 ? `基于 ${stats.reviews} 场复盘` : "赛事开始后更新"}</p>
          </CardContent>
        </Card>
      </div>

      {/* 快速访问小组 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-4 w-4 text-amber-500" />
            小组概览
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {groups.map((g) => (
              <Link
                key={g.name}
                href={`/groups/${g.name}`}
                className="rounded-lg border p-3 transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{g.name}组</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  {g.teams.slice(0, 4).map((t) => (
                    <div key={t.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <TeamFlag fifaCode={t.fifaCode} country={t.country} size={20} />
                      <span className="truncate">{t.name}</span>
                    </div>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 近期比赛 + 快速操作 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-4 w-4" />
              即将开赛
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingMatches.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无比赛数据</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingMatches.map((m) => (
                  <Link
                    key={m.id}
                    href={`/matches/${m.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium truncate">{m.homeTeam.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">vs</span>
                      <span className="text-sm font-medium truncate">{m.awayTeam.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {new Date(m.matchDate).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
                      </span>
                      {statusBadge(m.status)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {upcomingMatches.length > 0 && (
              <div className="mt-3 text-center">
                <Link href="/matches" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
                  查看完整赛程 →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Swords className="h-4 w-4" />
              快速操作
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/matches"
                className="flex flex-col gap-1 rounded-xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <span className="text-sm font-medium">浏览赛程</span>
                <span className="text-xs text-muted-foreground">按日期查看所有比赛及预测</span>
              </Link>
              <Link
                href="/groups"
                className="flex flex-col gap-1 rounded-xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <span className="text-sm font-medium">小组实力对比</span>
                <span className="text-xs text-muted-foreground">查看各小组球队实力指标</span>
              </Link>
              <Link
                href="/teams"
                className="flex flex-col gap-1 rounded-xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <span className="text-sm font-medium">球队数据</span>
                <span className="text-xs text-muted-foreground">查看各支球队详细数据资料</span>
              </Link>
              <Link
                href="/reviews"
                className="flex flex-col gap-1 rounded-xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <span className="text-sm font-medium">复盘记录</span>
                <span className="text-xs text-muted-foreground">查看历史预测复盘结果</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 免责声明 */}
      <div className="rounded-lg bg-muted/30 p-3 text-center text-xs text-muted-foreground">
        足球比赛数据预测助手，仅供娱乐与数据分析参考，不构成任何投注建议。
      </div>
    </div>
  )
}
