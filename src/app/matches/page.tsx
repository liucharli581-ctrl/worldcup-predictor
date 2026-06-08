"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, Swords, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { TeamFlag } from "@/components/team-flag"
import { predictMatch, confidenceLabel, upsetLabel, confidenceColor, upsetColor, type TeamStats } from "@/lib/predict-match"

interface Match {
  id: string
  competition: string
  matchStage: string
  matchDate: string
  status: string
  homeTeam: { id: string; name: string; fifaCode: string; country: string | null }
  awayTeam: { id: string; name: string; fifaCode: string; country: string | null }
  homeScore?: number | null
  awayScore?: number | null
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
    const map = new Map<string, { direction: string; confidence: string; upset: string }>()
    for (const m of matches) {
      if (m.status !== "scheduled") continue
      const home = allTeams.find((t) => t.fifaCode === m.homeTeam.fifaCode)
      const away = allTeams.find((t) => t.fifaCode === m.awayTeam.fifaCode)
      if (!home || !away) continue
      const isGroup = m.matchStage?.startsWith("Group")
      const result = predictMatch(home, away, isGroup)
      map.set(m.id, {
        direction: result.mainDirection,
        confidence: result.confidence,
        upset: result.upsetIndex,
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
              return (
                <Link
                  key={m.id}
                  href={`/matches/${m.id}`}
                  className="flex items-center rounded-xl border bg-card p-3 transition-all hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex flex-1 items-center gap-3">
                    {/* 主队 */}
                    <div className="flex flex-1 flex-col items-end">
                      <span className="text-sm font-semibold">
                        <TeamFlag fifaCode={m.homeTeam.fifaCode} country={m.homeTeam.country} size={20} className="mr-1" />
                        {m.homeTeam.name}
                      </span>
                      {m.homeTeam.fifaCode && (
                        <span className="text-[10px] text-muted-foreground">{m.homeTeam.fifaCode}</span>
                      )}
                    </div>

                    {/* 比分 / VS + 预测标签 */}
                    <div className="flex flex-col items-center gap-0.5 min-w-[100px]">
                      {m.status === "completed" && m.homeScore != null ? (
                        <span className="text-xl font-extrabold tabular-nums tracking-wider">
                          {m.homeScore} - {m.awayScore}
                        </span>
                      ) : (
                        <span className="text-base font-bold text-muted-foreground/60">VS</span>
                      )}
                      <div className="flex flex-wrap items-center justify-center gap-1">
                        {statusBadge(m.status)}
                        {m.matchStage && m.matchStage !== "group" && (
                          <Badge variant="outline" className="text-[10px]">
                            {m.matchStage}
                          </Badge>
                        )}
                      </div>
                      {/* 预测摘要 */}
                      {p && (
                        <div className="flex flex-wrap items-center justify-center gap-1 mt-0.5">
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap">
                            {p.direction}
                          </span>
                          <span className={`inline-block rounded px-1 py-[1px] text-[9px] font-semibold ${confidenceColor(p.confidence)}`}>
                            {confidenceLabel[p.confidence]}
                          </span>
                          <span className={`inline-block rounded px-1 py-[1px] text-[9px] font-semibold ${upsetColor(p.upset)}`}>
                            冷门{upsetLabel[p.upset]}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 客队 */}
                    <div className="flex flex-1 flex-col">
                      <span className="text-sm font-semibold">
                        {m.awayTeam.name}
                        <TeamFlag fifaCode={m.awayTeam.fifaCode} country={m.awayTeam.country} size={20} className="ml-1" />
                      </span>
                      {m.awayTeam.fifaCode && (
                        <span className="text-[10px] text-muted-foreground">{m.awayTeam.fifaCode}</span>
                      )}
                    </div>
                  </div>

                  {/* 日期 */}
                  <div className="ml-3 flex flex-col items-end gap-0.5 border-l pl-3 border-muted">
                    <span className="text-xs font-medium">
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
