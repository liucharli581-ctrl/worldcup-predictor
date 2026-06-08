"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Trophy, Users, Calendar, TrendingUp, Swords } from "lucide-react"
import { TeamFlag } from "@/components/team-flag"

interface TeamDetail {
  id: string
  name: string
  fifaCode: string
  country: string | null
  fifaRanking: number
  eloRating: number
  worldCupAppearances: number
  worldCupTitles: number
  bestWorldCupResult: string
  goalsFor: number
  goalsAgainst: number
  avgGoalsFor: number
  injuryScore: number
}

interface MatchDetail {
  id: string
  competition: string
  matchStage: string
  matchDate: string
  status: string
  homeTeam: { id: string; name: string; fifaCode: string }
  awayTeam: { id: string; name: string; fifaCode: string }
  homeScore?: number | null
  awayScore?: number | null
  predictions: { mainDirection: string; confidence: string }[]
}

interface GroupDetail {
  name: string
  teams: TeamDetail[]
  matches: MatchDetail[]
}

const GROUP_NAMES: Record<string, string> = {
  A: "A组", B: "B组", C: "C组", D: "D组",
  E: "E组", F: "F组", G: "G组", H: "H组",
  I: "I组", J: "J组", K: "K组", L: "L组",
}

export default function GroupDetailPage() {
  const params = useParams()
  const [data, setData] = useState<GroupDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/groups/${params.id}`)
      .then((r) => r.json())
      .then((res) => setData(res.data ?? null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [params.id])

  const rankingColor = (r: number) => {
    if (r <= 10) return "text-green-600 font-semibold"
    if (r <= 25) return "text-blue-600"
    if (r <= 45) return "text-yellow-600"
    return "text-muted-foreground"
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
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

  if (!data) {
    return (
      <div className="space-y-4">
        <Link href="/groups" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 返回分组列表
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12">
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">未找到该分组</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link href="/groups" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> 返回分组列表
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {GROUP_NAMES[data.name] ?? `${data.name}组`}
        </h1>
        <p className="text-muted-foreground">
          {data.teams.length} 支球队 · {data.matches.length} 场比赛
        </p>
      </div>

      {/* 小组积分榜（赛前版 — 展示球队实力指标） */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-amber-500" />
            球队实力对比
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">#</th>
                  <th className="pb-2 pr-3 font-medium">球队</th>
                  <th className="pb-2 pr-3 font-medium text-right">FIFA 排名</th>
                  <th className="pb-2 pr-3 font-medium text-right">Elo 评分</th>
                  <th className="pb-2 pr-3 font-medium text-right">世界杯次数</th>
                  <th className="pb-2 pr-3 font-medium text-right">冠军</th>
                  <th className="pb-2 pr-2 font-medium text-right">最佳战绩</th>
                </tr>
              </thead>
              <tbody>
                {data.teams.map((t, i) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2.5 pr-3 text-muted-foreground">{i + 1}</td>
                    <td className="py-2.5 pr-3">
                      <Link href={`/teams/${t.id}`} className="flex items-center gap-1.5 font-medium hover:text-amber-600">
                        <TeamFlag fifaCode={t.fifaCode} country={t.country} size={20} />
                        {t.name}
                        <Badge variant="outline" className="text-[10px] font-mono">{t.fifaCode}</Badge>
                      </Link>
                    </td>
                    <td className={`py-2.5 pr-3 text-right ${rankingColor(t.fifaRanking)}`}>
                      {t.fifaRanking}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{t.eloRating}</td>
                    <td className="py-2.5 pr-3 text-right">{t.worldCupAppearances}</td>
                    <td className="py-2.5 pr-3 text-right">{t.worldCupTitles}</td>
                    <td className="py-2.5 text-right text-xs">{t.bestWorldCupResult}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 小组赛程 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            小组赛程
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.matches.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无赛程数据</p>
          ) : (
            <div className="space-y-3">
              {data.matches.map((m) => (
                <Link
                  key={m.id}
                  href={`/matches/${m.id}`}
                  className="flex items-center rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
                >
                  <div className="flex flex-1 items-center gap-4">
                    <div className="flex flex-1 flex-col items-end">
                      <span className="text-sm font-medium">{m.homeTeam.name}</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      {m.status === "completed" && m.homeScore != null ? (
                        <span className="text-lg font-bold tabular-nums">
                          {m.homeScore} : {m.awayScore}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                          <span className="text-sm font-semibold text-muted-foreground">VS</span>
                          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        {statusBadge(m.status)}
                        {m.predictions?.[0] && m.status === "scheduled" && (
                          <Badge variant="secondary" className="text-[10px]">
                            {m.predictions[0].mainDirection === "home_win" ? "预测: 主胜" :
                             m.predictions[0].mainDirection === "away_win" ? "预测: 客胜" : "预测: 平局"}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col">
                      <span className="text-sm font-medium">{m.awayTeam.name}</span>
                    </div>
                  </div>
                  <div className="ml-3 flex flex-col items-end gap-0.5">
                    <span className="text-xs text-muted-foreground">
                      {new Date(m.matchDate).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(m.matchDate).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 快速操作 */}
      <div className="flex gap-3">
        <Link href="/matches" className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
          <Swords className="h-4 w-4" /> 查看所有比赛
        </Link>
        <Link href="/teams" className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
          <Users className="h-4 w-4" /> 浏览球队数据
        </Link>
      </div>
    </div>
  )
}
