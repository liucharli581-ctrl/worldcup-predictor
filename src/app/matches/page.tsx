"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, Swords, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { TeamFlag } from "@/components/team-flag"
import { predictMatch, confidenceLabel, confidenceColor, type TeamStats } from "@/lib/predict-match"

interface MatchTeam {
  id: string; name: string; fifaCode: string; country: string | null
  fifaRanking?: number | null; baseScore?: number | null; formLabel?: string | null
}

interface Match {
  id: string
  competition: string
  matchStage: string
  matchDate: string
  status: string
  homeTeam: MatchTeam
  awayTeam: MatchTeam
  actualHomeScore?: number | null
  actualAwayScore?: number | null
  actualResult?: string | null
  odds?: { id: string; bookmaker: string; currentHomeWin: number; currentDraw: number; currentAwayWin: number }[]
  predictions?: { homeWinProbability: number; drawProbability: number; awayWinProbability: number; mainDirection: string | null; confidence: string | null }[]
}

const GROUP_NAMES: Record<string, string> = {
  A: "A组", B: "B组", C: "C组", D: "D组",
  E: "E组", F: "F组", G: "G组", H: "H组",
  I: "I组", J: "J组", K: "K组", L: "L组",
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [allTeams, setAllTeams] = useState<TeamStats[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/matches").then((r) => r.json()),
      fetch("/api/teams").then((r) => r.json()),
    ])
      .then(([matchesRes, teamsRes]) => {
        const list: Match[] = (matchesRes.data ?? []).sort(
          (a: Match, b: Match) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
        )
        setMatches(list)
        setAllTeams(teamsRes.data ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // 获取所有比赛日（去重）
  const matchDays = useMemo(() => {
    const days = new Set<string>()
    for (const m of matches) {
      const d = new Date(m.matchDate).toLocaleDateString("zh-CN")
      days.add(d)
    }
    return Array.from(days).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  }, [matches])

  // 当前选中的日期索引
  const [currentDayIdx, setCurrentDayIdx] = useState(-1)

  // 按比赛日分组
  const groupedByDate = useMemo(() => {
    const todayStr = new Date().toLocaleDateString("zh-CN")
    const todayIdx = matchDays.indexOf(todayStr)
    if (currentDayIdx === -1 && todayIdx >= 0) {
      setCurrentDayIdx(todayIdx)
    }
    return matchDays.map((day) => ({
      label: day,
      matches: matches.filter(
        (m) => new Date(m.matchDate).toLocaleDateString("zh-CN") === day
      ),
    }))
  }, [matches, matchDays, currentDayIdx])

  const currentGroup = groupedByDate[currentDayIdx] ?? null

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "secondary" | "default" | "outline" | "destructive" }> = {
      scheduled: { label: "未开始", variant: "secondary" },
      live: { label: "进行中", variant: "default" },
      completed: { label: "已结束", variant: "outline" },
    }
    const s = map[status] ?? { label: status, variant: "outline" as const }
    return <Badge variant={s.variant}>{s.label}</Badge>
  }

  const filtered = search
    ? matches.filter(
        (m) =>
          m.homeTeam.name.toLowerCase().includes(search.toLowerCase()) ||
          m.awayTeam.name.toLowerCase().includes(search.toLowerCase())
      )
    : null

  const displayMatches = filtered ?? (currentGroup?.matches ?? matches)

  // Pre-compute predictions for scheduled matches
  const predictions = useMemo(() => {
    const map = new Map<string, { direction: string; confidence: string; upset: string; homeWinProb: number; drawProb: number; awayWinProb: number }>()
    for (const m of matches) {
      if (m.status !== "scheduled") continue
      // Try server prediction first
      if (m.predictions && m.predictions.length > 0) {
        const sp = m.predictions[0]
        const dir =
          sp.mainDirection === "home_win" ? `${m.homeTeam.name}胜` :
          sp.mainDirection === "away_win" ? `${m.awayTeam.name}胜` :
          sp.mainDirection === "draw" ? "平局" : "方向待定"
        map.set(m.id, {
          direction: dir,
          confidence: sp.confidence ?? "",
          upset: "",
          homeWinProb: sp.homeWinProbability,
          drawProb: sp.drawProbability,
          awayWinProb: sp.awayWinProbability,
        })
        continue
      }
      const home = allTeams.find((t) => t.fifaCode === m.homeTeam.fifaCode)
      const away = allTeams.find((t) => t.fifaCode === m.awayTeam.fifaCode)
      if (!home || !away) continue
      const isGroup = m.matchStage?.startsWith("Group")
      const result = predictMatch(home, away, isGroup)
      map.set(m.id, {
        direction: result.mainDirection,
        confidence: result.confidence,
        upset: result.upsetIndex,
        homeWinProb: result.homeWinProb,
        drawProb: result.drawProb,
        awayWinProb: result.awayWinProb,
      })
    }
    return map
  }, [matches, allTeams])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">赛程</h1>
        <p className="text-muted-foreground">2026 世界杯完整赛程</p>
      </div>

      {/* 搜索 + 日期选择 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="搜索球队..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate?.toISOString().split("T")[0] ?? ""}
            onChange={(e) => {
              if (e.target.value) {
                const d = new Date(e.target.value + "T00:00:00")
                setSelectedDate(d)
                const dayStr = d.toLocaleDateString("zh-CN")
                const idx = matchDays.indexOf(dayStr)
                if (idx >= 0) setCurrentDayIdx(idx)
              } else {
                setSelectedDate(null)
              }
            }}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* 日期导航（仅在非搜索模式下） */}
      {!search && matchDays.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8"
            onClick={() => setCurrentDayIdx(Math.max(0, currentDayIdx - 1))}
            disabled={currentDayIdx <= 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex gap-1.5">
            {groupedByDate.map((g, i) => {
              const isToday =
                g.label === new Date().toLocaleDateString("zh-CN")
              const isActive = i === currentDayIdx
              return (
                <button
                  key={g.label}
                  onClick={() => setCurrentDayIdx(i)}
                  className={cn(
                    "flex shrink-0 flex-col items-center rounded-lg px-3 py-1.5 text-xs transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-muted-foreground",
                    isToday && !isActive && "ring-1 ring-primary/30"
                  )}
                >
                  <span className="font-medium">
                    {new Date(g.label).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
                  </span>
                  <span className="text-[10px] opacity-70">{g.matches.length} 场</span>
                </button>
              )
            })}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8"
            onClick={() => setCurrentDayIdx(Math.min(matchDays.length - 1, currentDayIdx + 1))}
            disabled={currentDayIdx >= matchDays.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* 比赛列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        </div>
      ) : displayMatches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12">
            <Swords className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">暂无比赛数据</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {search && (
            <p className="text-xs text-muted-foreground">
              找到 {displayMatches.length} 场比赛
            </p>
          )}

          <div className="space-y-2.5">
            {displayMatches.map((m) => {
              const p = predictions.get(m.id)
              const odds = m.odds?.[0]
              return (
                <Link
                  key={m.id}
                  href={`/matches/${m.id}`}
                  className="flex items-center rounded-xl border bg-card p-2.5 transition-all hover:shadow-md hover:-translate-y-0.5"
                >
                  {/* 主队 */}
                  <div className="flex flex-[2] flex-col items-end min-w-0">
                    <span className="text-sm font-semibold truncate max-w-full">
                      <TeamFlag fifaCode={m.homeTeam.fifaCode} country={m.homeTeam.country} size={18} className="mr-1" />
                      {m.homeTeam.name}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {m.homeTeam.fifaRanking && (
                        <span className="text-[10px] text-muted-foreground">FIFA #{m.homeTeam.fifaRanking}</span>
                      )}
                      {m.homeTeam.baseScore != null && (
                        <span className="text-[10px] text-muted-foreground">{m.homeTeam.baseScore.toFixed(0)}分</span>
                      )}
                    </div>
                  </div>

                  {/* 中间：比分/VS + 赔率预览 */}
                  <div className="flex flex-col items-center gap-1 mx-2 min-w-[120px]">
                    {m.status === "completed" && m.actualHomeScore != null ? (
                      <span className="text-lg sm:text-xl font-extrabold tabular-nums tracking-wider">
                        {m.actualHomeScore} - {m.actualAwayScore}
                      </span>
                    ) : m.status === "completed" ? (
                      <span className="text-sm text-muted-foreground">? - ?</span>
                    ) : (
                      <>
                        <span className="text-base font-bold text-muted-foreground/60">VS</span>
                        {/* 赔率预览（未开始比赛） */}
                        {odds && m.status === "scheduled" && (
                          <div className="flex items-center gap-1 text-[10px] font-mono tabular-nums">
                            <span className="rounded bg-green-50 px-1.5 py-0.5 text-green-700 dark:bg-green-950/20 dark:text-green-400 font-medium">
                              {odds.currentHomeWin.toFixed(2)}
                            </span>
                            <span className="rounded bg-yellow-50 px-1.5 py-0.5 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400 font-medium">
                              {odds.currentDraw.toFixed(2)}
                            </span>
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 font-medium">
                              {odds.currentAwayWin.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex flex-wrap items-center justify-center gap-1">
                      {statusBadge(m.status)}
                      {m.status === "completed" && m.predictions?.[0]?.mainDirection && m.actualResult && (
                        <Badge variant={m.predictions[0].mainDirection === m.actualResult ? "default" : "destructive"} className="text-[9px] px-1 py-0">
                          {m.predictions[0].mainDirection === m.actualResult ? "命中" : "偏差"}
                        </Badge>
                      )}
                      {m.matchStage && m.matchStage !== "group" && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0">{m.matchStage}</Badge>
                      )}
                    </div>
                    {/* 预测迷你概率条 */}
                    {p && m.status === "scheduled" && (
                      <div className="flex h-1.5 w-full max-w-[100px] overflow-hidden rounded-full bg-muted">
                        <div className="bg-green-500" style={{ width: `${p.homeWinProb}%` }} />
                        <div className="bg-yellow-400" style={{ width: `${p.drawProb}%` }} />
                        <div className="bg-blue-500" style={{ width: `${p.awayWinProb}%` }} />
                      </div>
                    )}
                    {p && (
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap">
                          {p.direction}
                        </span>
                        <span className={`inline-block rounded px-1 py-[1px] text-[8px] font-semibold ${confidenceColor(p.confidence)}`}>
                          {confidenceLabel[p.confidence]}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 客队 */}
                  <div className="flex flex-[2] flex-col min-w-0">
                    <span className="text-sm font-semibold truncate max-w-full">
                      {m.awayTeam.name}
                      <TeamFlag fifaCode={m.awayTeam.fifaCode} country={m.awayTeam.country} size={18} className="ml-1" />
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {m.awayTeam.fifaRanking && (
                        <span className="text-[10px] text-muted-foreground">FIFA #{m.awayTeam.fifaRanking}</span>
                      )}
                      {m.awayTeam.baseScore != null && (
                        <span className="text-[10px] text-muted-foreground">{m.awayTeam.baseScore.toFixed(0)}分</span>
                      )}
                    </div>
                  </div>

                  {/* 日期 */}
                  <div className="ml-2 flex flex-col items-end gap-0.5 border-l pl-2 border-muted min-w-[52px]">
                    <span className="text-[11px] font-medium whitespace-nowrap">
                      {new Date(m.matchDate).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(m.matchDate).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* 底部免责声明 */}
          <div className="rounded-lg bg-muted/30 p-3 text-center text-xs text-muted-foreground">
            足球比赛数据预测助手，仅供娱乐与数据分析参考，不构成任何投注建议。
          </div>
        </>
      )}
    </div>
  )
}
