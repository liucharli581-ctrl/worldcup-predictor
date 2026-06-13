"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TeamFlag } from "@/components/team-flag"
import { RefreshCw, Swords, Users, TrendingUp, Calendar, Trophy, ChevronRight, BarChart3, CheckCircle2, PlayCircle, Radio } from "lucide-react"

interface Team {
  id: string
  name: string
  fifaCode: string
  country: string | null
  fifaRanking: number
}

interface Match {
  id: string
  competition: string
  matchStage: string
  matchDate: string
  status: string
  homeTeam: { id: string; name: string; country: string | null; fifaCode?: string }
  awayTeam: { id: string; name: string; country: string | null; fifaCode?: string }
  actualHomeScore?: number | null
  actualAwayScore?: number | null
  actualResult?: string | null
  predictions?: { mainDirection: string | null }[]
}

// 格式化日期为 zh-CN 短格式
function fmtDate(iso: string) {
  const d = new Date(iso)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hour = d.getHours().toString().padStart(2, "0")
  const min = d.getMinutes().toString().padStart(2, "0")
  return { date: `${month}月${day}日`, time: `${hour}:${min}` }
}

// 判断是否今天的比赛
function isToday(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
}

export default function Dashboard() {
  const [stats, setStats] = useState({ teams: 0, matches: 0, scheduled: 0, completed: 0, reviews: 0, hitRate: 0 })
  const [todayMatches, setTodayMatches] = useState<Match[]>([])
  const [liveMatches, setLiveMatches] = useState<Match[]>([])
  const [recentResults, setRecentResults] = useState<Match[]>([])
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([])
  const [groups, setGroups] = useState<{ name: string; teams: Team[] }[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const now = new Date()
        const todayStr = now.toISOString().slice(0, 10)
        // 计算 3 天前的日期
        const threeDaysAgo = new Date(now)
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

        const [teamsRes, matchesRes, reviewsRes, groupsRes, todayRes, completedRes, liveRes] = await Promise.all([
          fetch("/api/teams"),
          fetch("/api/matches"),
          fetch("/api/reviews"),
          fetch("/api/groups"),
          fetch(`/api/matches?date=${todayStr}`),
          fetch("/api/matches?status=completed"),
          fetch("/api/matches?status=live"),
        ])
        const teams = await teamsRes.json()
        const matches = await matchesRes.json()
        const reviews = await reviewsRes.json()
        const groupsData = await groupsRes.json()
        const todayData = await todayRes.json()
        const completedData = await completedRes.json()
        const liveData = await liveRes.json()

        const teamList: Team[] = teams.data ?? []
        const matchList: Match[] = (matches.data ?? []).sort(
          (a: Match, b: Match) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
        )
        const reviewList = reviews.data ?? []
        const groupList = groupsData.data ?? []

        const todayList: Match[] = todayData.data ?? []
        const completedList: Match[] = completedData.data ?? []

        const hits = reviewList.filter((r: { predictionHit: boolean }) => r.predictionHit).length
        const hitRate = reviewList.length > 0 ? Math.round((hits / reviewList.length) * 100) : 0
        const scheduledCount = matchList.filter((m) => m.status === "scheduled").length
        const completedCount = matchList.filter((m) => m.status === "completed").length

        setStats({
          teams: teamList.length,
          matches: matchList.length,
          scheduled: scheduledCount,
          completed: completedCount,
          reviews: reviewList.length,
          hitRate,
        })

        // 今天的比赛（按时间排序）
        const todaySorted = [...todayList].sort(
          (a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
        )
        setTodayMatches(todaySorted)

        // 进行中的比赛
        const liveList: Match[] = liveData.data ?? []
        setLiveMatches(liveList)

        // 最近赛果（已完成比赛，最近 3 天，按时间倒序）
        const recent = completedList
          .filter((m: Match) => new Date(m.matchDate) >= threeDaysAgo)
          .sort((a: Match, b: Match) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime())
        setRecentResults(recent.length > 0 ? recent.slice(0, 6) : completedList.slice(0, 6))

        // 即将开赛（排除了今天的）
        const up = matchList.filter((m) => m.status === "scheduled" && !isToday(m.matchDate)).slice(0, 5)
        setUpcomingMatches(up)

        setGroups(groupList)
        setLastUpdated(new Date())
      } catch (e) {
        console.error("Dashboard load error:", e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // 轮询：每 30 秒刷新进行中比赛和最新赛果
  const pollLiveData = useCallback(async () => {
    try {
      const now = new Date()
      const threeDaysAgo = new Date(now)
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

      const [completedRes, liveRes] = await Promise.all([
        fetch("/api/matches?status=completed"),
        fetch("/api/matches?status=live"),
      ])
      const completedData = await completedRes.json()
      const liveData = await liveRes.json()

      const completedList: Match[] = completedData.data ?? []
      const liveList: Match[] = liveData.data ?? []

      setLiveMatches(liveList)

      const recent = completedList
        .filter((m: Match) => new Date(m.matchDate) >= threeDaysAgo)
        .sort((a: Match, b: Match) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime())
      setRecentResults(recent.length > 0 ? recent.slice(0, 6) : completedList.slice(0, 6))

      setLastUpdated(new Date())
    } catch (e) {
      console.error("轮询错误:", e)
    }
  }, [])

  // 自动轮询：30 秒间隔
  useEffect(() => {
    pollRef.current = setInterval(pollLiveData, 30000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [pollLiveData])

  // 手动刷新（触发后台同步后重载页面）
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await fetch("/api/admin/refresh-data", { method: "POST" })
      await pollLiveData()
      window.location.reload()
    } catch (e) {
      console.error("刷新错误:", e)
    } finally {
      setIsRefreshing(false)
    }
  }, [pollLiveData])

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

  const todayStr = new Date().toLocaleDateString("zh-CN", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  })

  return (
    <div className="space-y-6">
      {/* 标题区域 */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            <h1 className="text-2xl font-bold tracking-tight">2026 世界杯</h1>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-muted-foreground">美国 · 加拿大 · 墨西哥 | 2026.06.11 - 07.19</p>
            <span className="hidden sm:inline text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{todayStr}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "刷新中..." : "刷新数据"}
          </button>
          {lastUpdated && (
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {lastUpdated.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} 更新
            </span>
          )}
        </div>
      </div>

      {/* 最新赛果 —— 置顶展示 */}
      <Card className="overflow-hidden border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-800/30">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <h2 className="text-base font-semibold text-green-800 dark:text-green-300">最新赛果</h2>
            {recentResults.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">{recentResults.length} 场</Badge>
            )}
          </div>

          {recentResults.length === 0 ? (
            <div className="rounded-xl border bg-white/40 p-6 text-center dark:bg-white/5">
              <p className="text-sm text-muted-foreground">暂无已完成的比赛，首场比赛结束后将在这里展示赛果</p>
            </div>
          ) : (
            <>
              {/* 最新一场 —— 大比分显示 */}
              {(() => {
                const latest = recentResults[0]
                const ft = fmtDate(latest.matchDate)
                const h = latest.actualHomeScore
                const a = latest.actualAwayScore
                const homeWon = h != null && a != null && h > a
                const awayWon = a != null && h != null && a > h
                const predicted = latest.predictions?.[0]?.mainDirection
                const hit = predicted && latest.actualResult && predicted === latest.actualResult
                return (
                  <Link
                    key={latest.id}
                    href={`/matches/${latest.id}`}
                    className="block rounded-xl border-2 border-green-300 bg-white/60 p-5 transition-all hover:shadow-lg hover:-translate-y-0.5 dark:border-green-700/30 dark:bg-white/5 mb-3"
                  >
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-6 sm:gap-10">
                        <div className="flex flex-col items-center gap-1 sm:min-w-[120px]">
                          <TeamFlag fifaCode={latest.homeTeam.fifaCode} country={latest.homeTeam.country} size={32} />
                          <span className={`text-base font-semibold ${homeWon ? "text-foreground" : "text-muted-foreground"}`}>
                            {latest.homeTeam.name}
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-4xl sm:text-5xl font-extrabold tabular-nums tracking-tight">
                            <span className={homeWon ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}>{h ?? "?"}</span>
                            <span className="text-muted-foreground/40 mx-2">:</span>
                            <span className={awayWon ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}>{a ?? "?"}</span>
                          </span>
                          <span className="text-xs text-muted-foreground mt-1">{ft.date} · {latest.matchStage}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 sm:min-w-[120px]">
                          <TeamFlag fifaCode={latest.awayTeam.fifaCode} country={latest.awayTeam.country} size={32} />
                          <span className={`text-base font-semibold ${awayWon ? "text-foreground" : "text-muted-foreground"}`}>
                            {latest.awayTeam.name}
                          </span>
                        </div>
                      </div>
                      {hit != null && (
                        <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                          hit
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}>
                          {hit ? "✓ 预测命中" : "✗ 预测偏差"}
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })()}

              {/* 其余赛果列表 */}
              {recentResults.length > 1 && (
                <div className="space-y-1.5">
                  {recentResults.slice(1).map((m) => {
                    const ft = fmtDate(m.matchDate)
                    const h = m.actualHomeScore
                    const a = m.actualAwayScore
                    const homeWon = h != null && a != null && h > a
                    const awayWon = a != null && h != null && a > h
                    const predicted = m.predictions?.[0]?.mainDirection
                    const hit = predicted && m.actualResult && predicted === m.actualResult
                    return (
                      <Link
                        key={m.id}
                        href={`/matches/${m.id}`}
                        className="flex items-center justify-between rounded-lg border border-green-100 bg-white/40 p-3 transition-colors hover:bg-accent dark:border-green-900/20"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <TeamFlag fifaCode={m.homeTeam.fifaCode} country={m.homeTeam.country} size={18} />
                          <span className={`text-sm ${homeWon ? "font-semibold" : "text-muted-foreground"}`}>
                            {m.homeTeam.name}
                          </span>
                          <span className="text-sm font-bold tabular-nums">
                            {h != null ? h : "?"} : {a != null ? a : "?"}
                          </span>
                          <span className={`text-sm ${awayWon ? "font-semibold" : "text-muted-foreground"}`}>
                            {m.awayTeam.name}
                          </span>
                          <TeamFlag fifaCode={m.awayTeam.fifaCode} country={m.awayTeam.country} size={18} />
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <span className="text-xs text-muted-foreground">{ft.date}</span>
                          {hit != null && (
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                              hit
                                ? "bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400"
                                : "bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400"
                            }`}>
                              {hit ? "✓" : "✗"}
                            </span>
                          )}
                          <Badge variant="outline" className="text-[10px]">{m.matchStage}</Badge>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}

              <div className="mt-3 text-center">
                <Link href="/matches?status=completed" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
                  查看全部赛果 →
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 今日比赛高亮 */}
      {todayMatches.length > 0 && (
        <Card className="overflow-hidden border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 dark:border-blue-800/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <PlayCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-semibold text-blue-800 dark:text-blue-300">今日比赛</h2>
              <Badge variant="secondary" className="text-[10px]">{todayMatches.length} 场</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {todayMatches.map((m) => {
                const ft = fmtDate(m.matchDate)
                const isFinished = m.status === "completed"
                return (
                  <Link
                    key={m.id}
                    href={`/matches/${m.id}`}
                    className="flex items-center justify-between rounded-xl border bg-white/60 p-4 transition-all hover:shadow-md hover:-translate-y-0.5 dark:bg-white/5"
                  >
                    <div className="flex flex-1 items-center gap-3">
                      <div className="flex flex-col items-end min-w-0">
                        <span className="flex items-center gap-1.5 text-sm font-semibold">
                          {m.homeTeam.name}
                          <TeamFlag fifaCode={m.homeTeam.fifaCode} country={m.homeTeam.country} size={20} />
                        </span>
                      </div>
                      <div className="flex flex-col items-center px-2">
                        {isFinished ? (
                          <span className="text-lg font-extrabold tabular-nums text-foreground">
                            {m.actualHomeScore} : {m.actualAwayScore}
                          </span>
                        ) : (
                          <>
                            <span className="text-sm font-bold text-muted-foreground">VS</span>
                            <span className="text-[10px] text-muted-foreground">{ft.time}</span>
                          </>
                        )}
                        <span className="text-[10px] text-muted-foreground mt-0.5">{m.matchStage}</span>
                      </div>
                      <div className="flex flex-col items-start min-w-0">
                        <span className="flex items-center gap-1.5 text-sm font-semibold">
                          <TeamFlag fifaCode={m.awayTeam.fifaCode} country={m.awayTeam.country} size={20} />
                          {m.awayTeam.name}
                        </span>
                      </div>
                    </div>
                    <div className="ml-2 shrink-0">{statusBadge(m.status)}</div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 进行中比赛 —— 无数据时显示空状态 */}
      <Card className={`overflow-hidden ${
        liveMatches.length > 0
          ? "border-red-200 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 dark:border-red-800/30"
          : "border-muted"
      }`}>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Radio className={`h-5 w-5 ${liveMatches.length > 0 ? "text-red-600 dark:text-red-400 animate-pulse" : "text-muted-foreground"}`} />
            <h2 className={`text-base font-semibold ${liveMatches.length > 0 ? "text-red-800 dark:text-red-300" : "text-muted-foreground"}`}>
              进行中比赛
            </h2>
            {liveMatches.length > 0 && <Badge variant="destructive" className="text-[10px]">{liveMatches.length} 场</Badge>}
          </div>
          {liveMatches.length === 0 ? (
            <div className="rounded-xl border bg-white/40 p-6 text-center dark:bg-white/5">
              <p className="text-sm text-muted-foreground">当前没有正在进行中的比赛</p>
              <p className="text-xs text-muted-foreground/60 mt-1">赛程开始后将自动更新</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {liveMatches.map((m) => {
                const ft = fmtDate(m.matchDate)
                return (
                  <Link
                    key={m.id}
                    href={`/matches/${m.id}`}
                    className="flex items-center justify-between rounded-xl border bg-white/60 p-4 transition-all hover:shadow-md hover:-translate-y-0.5 dark:bg-white/5"
                  >
                    <div className="flex flex-1 items-center gap-3">
                      <div className="flex flex-col items-end min-w-0">
                        <span className="flex items-center gap-1.5 text-sm font-semibold">
                          {m.homeTeam.name}
                          <TeamFlag fifaCode={m.homeTeam.fifaCode} country={m.homeTeam.country} size={20} />
                        </span>
                      </div>
                      <div className="flex flex-col items-center px-2">
                        <span className="text-lg font-extrabold tabular-nums text-red-600 dark:text-red-400">
                          {m.actualHomeScore ?? "?"} : {m.actualAwayScore ?? "?"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{m.matchStage}</span>
                      </div>
                      <div className="flex flex-col items-start min-w-0">
                        <span className="flex items-center gap-1.5 text-sm font-semibold">
                          <TeamFlag fifaCode={m.awayTeam.fifaCode} country={m.awayTeam.country} size={20} />
                          {m.awayTeam.name}
                        </span>
                      </div>
                    </div>
                    <div className="ml-2 shrink-0">
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                        直播
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
            <p className="text-xs text-muted-foreground">
              {stats.completed > 0
                ? <span>已完成 <span className="font-semibold text-green-600">{stats.completed}</span> 场 / 未开始 <span className="text-muted-foreground">{stats.scheduled}</span> 场</span>
                : "已加载赛程数据"}
            </p>
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

      {/* 即将开赛 + 快速操作 */}
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
              <p className="text-sm text-muted-foreground">暂无更多未开始比赛</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingMatches.map((m) => {
                  const ft = fmtDate(m.matchDate)
                  return (
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
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground tabular-nums">{ft.date}</div>
                          <div className="text-[10px] text-muted-foreground tabular-nums">{ft.time}</div>
                        </div>
                        {statusBadge(m.status)}
                      </div>
                    </Link>
                  )
                })}
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
