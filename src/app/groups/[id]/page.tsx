"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Trophy, Users, Calendar, Swords, ShieldAlert, TrendingUp, BrainCircuit } from "lucide-react"
import { TeamFlag } from "@/components/team-flag"
import { classifyGroupTiers, isKeyMatch, generateGroupSummary } from "@/lib/analysis"
import type { TeamAnalysisData } from "@/lib/analysis"

interface TeamDetail {
  id: string
  name: string
  fifaCode: string | null
  country: string | null
  fifaRanking: number
  eloRating: number
  worldCupAppearances: number
  worldCupTitles: number
  bestWorldCupResult: string
  goalsFor: number
  goalsAgainst: number
  avgGoalsFor: number
  avgGoalsAgainst: number
  totalWins: number
  totalDraws: number
  totalLosses: number
  totalMatches: number
  recent5Wins: number
  recent5Draws: number
  recent5Losses: number
  injuryScore: number
  baseScore: number | null
  formLabel: string | null
}

interface MatchDetail {
  id: string
  competition: string | null
  matchStage: string | null
  matchDate: string
  status: string
  actualHomeScore: number | null
  actualAwayScore: number | null
  homeTeam: { id: string; name: string; fifaCode: string | null; groupName: string | null }
  awayTeam: { id: string; name: string; fifaCode: string | null; groupName: string | null }
  predictions: {
    mainDirection: string | null
    confidence: string | null
    riskLevel: string | null
  }[]
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

function rankingColor(r: number) {
  if (r <= 10) return "text-green-600 font-semibold"
  if (r <= 25) return "text-blue-600"
  if (r <= 45) return "text-yellow-600"
  return "text-muted-foreground"
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    scheduled: { label: "未开始", variant: "secondary" },
    live: { label: "进行中", variant: "default" },
    completed: { label: "已结束", variant: "outline" },
  }
  const s = map[status] ?? { label: status, variant: "outline" as const }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

function riskBadge(level: string | null) {
  if (!level) return null
  const map: Record<string, { color: string; label: string }> = {
    low: { color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", label: "低风险" },
    medium_low: { color: "bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-400", label: "中低风险" },
    medium: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", label: "中等风险" },
    medium_high: { color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400", label: "中高风险" },
    high: { color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", label: "高风险" },
  }
  const m = map[level] ?? { color: "bg-gray-100 text-gray-800", label: level }
  return <Badge className={`${m.color} text-[10px]`}>{m.label}</Badge>
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

  // 小组分层
  const tiers = useMemo(() => {
    if (!data) return null
    const teamsWithScore: TeamAnalysisData[] = data.teams.map((t) => ({
      ...t,
      fifaCode: t.fifaCode ?? "",
      baseScore: t.baseScore ?? 0,
      injuryScore: t.injuryScore ?? 0,
      formLabel: t.formLabel ?? undefined,
    }))
    return classifyGroupTiers(teamsWithScore)
  }, [data])

  const groupSummary = useMemo(() => {
    if (!tiers) return ""
    return generateGroupSummary(tiers)
  }, [tiers])

  // 关键战
  const keyMatches = useMemo(() => {
    if (!data) return new Set<string>()
    const set = new Set<string>()
    for (const m of data.matches) {
      const homeTeam = data.teams.find((t) => t.name === m.homeTeam.name)
      const awayTeam = data.teams.find((t) => t.name === m.awayTeam.name)
      if (homeTeam && awayTeam) {
        const hBase = homeTeam.baseScore ?? 50
        const aBase = awayTeam.baseScore ?? 50
        if (isKeyMatch(hBase, aBase)) set.add(m.id)
      }
    }
    return set
  }, [data])

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

      {/* 小组分层卡片 */}
      {tiers && tiers.length > 0 && (
        <Card className="border-indigo-200 dark:border-indigo-800/30">
          <CardHeader className="border-b border-indigo-100 dark:border-indigo-900/20">
            <CardTitle className="flex items-center gap-2 text-base">
              <BrainCircuit className="h-4 w-4 text-indigo-500" />
              小组实力分层
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {groupSummary && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm leading-relaxed">
                {groupSummary}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              {tiers.map((tier) => (
                <div key={tier.tier} className="rounded-lg border p-3">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tier.tier}</h3>
                  <div className="space-y-1.5">
                    {tier.teams.map((team) => (
                      <Link
                        key={team.id}
                        href={`/teams/${team.id}`}
                        className="flex items-center justify-between rounded-md bg-muted/30 px-2.5 py-1.5 text-sm hover:bg-muted/60 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <TeamFlag fifaCode={team.fifaCode} country={null} size={16} />
                          {team.name}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {team.baseScore}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 球队实力对比 */}
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
                  <th className="pb-2 pr-3 font-medium text-right">基础分</th>
                  <th className="pb-2 pr-3 font-medium text-right">FIFA 排名</th>
                  <th className="pb-2 pr-3 font-medium text-right">Elo 评分</th>
                  <th className="pb-2 pr-3 font-medium text-right hidden sm:table-cell">世界杯</th>
                  <th className="pb-2 pr-3 font-medium text-right hidden sm:table-cell">冠军</th>
                  <th className="pb-2 pr-2 font-medium text-right hidden sm:table-cell">状态</th>
                </tr>
              </thead>
              <tbody>
                {data.teams
                  .sort((a, b) => (b.baseScore ?? 0) - (a.baseScore ?? 0))
                  .map((t, i) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2.5 pr-3 text-muted-foreground">{i + 1}</td>
                    <td className="py-2.5 pr-3">
                      <Link href={`/teams/${t.id}`} className="flex items-center gap-1.5 font-medium hover:text-amber-600">
                        <TeamFlag fifaCode={t.fifaCode} country={t.country} size={20} />
                        {t.name}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono tabular-nums font-semibold">
                      {t.baseScore ?? "-"}
                    </td>
                    <td className={`py-2.5 pr-3 text-right ${rankingColor(t.fifaRanking)}`}>
                      {t.fifaRanking}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{t.eloRating}</td>
                    <td className="py-2.5 pr-3 text-right hidden sm:table-cell">{t.worldCupAppearances}</td>
                    <td className="py-2.5 pr-3 text-right hidden sm:table-cell">{t.worldCupTitles}</td>
                    <td className="py-2.5 text-right hidden sm:table-cell">
                      {t.formLabel && (
                        <Badge variant="outline" className="text-[10px]">{t.formLabel}</Badge>
                      )}
                    </td>
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
            {keyMatches.size > 0 && (
              <Badge variant="secondary" className="text-[10px] ml-2">
                {keyMatches.size} 场关键战
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.matches.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无赛程数据</p>
          ) : (
            <div className="space-y-3">
              {data.matches.map((m) => {
                const isKey = keyMatches.has(m.id)
                return (
                  <Link
                    key={m.id}
                    href={`/matches/${m.id}`}
                    className={`flex items-center rounded-lg border bg-card p-3 transition-colors hover:bg-accent ${
                      isKey ? "border-amber-300 dark:border-amber-700/50 bg-amber-50/30 dark:bg-amber-950/10" : ""
                    }`}
                  >
                    <div className="flex flex-1 items-center gap-4">
                      <div className="flex flex-1 flex-col items-end">
                        <span className="text-sm font-medium">{m.homeTeam.name}</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        {m.status === "completed" && m.actualHomeScore != null ? (
                          <span className="text-lg font-bold tabular-nums">
                            {m.actualHomeScore} : {m.actualAwayScore}
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                            <span className="text-sm font-semibold text-muted-foreground">VS</span>
                            <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                          </div>
                        )}
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {statusBadge(m.status)}
                          {isKey && m.status === "scheduled" && (
                            <Badge variant="default" className="text-[10px] bg-amber-500 hover:bg-amber-600">
                              关键战
                            </Badge>
                          )}
                          {m.predictions?.[0] && m.status === "scheduled" && (
                            <>
                              <Badge variant="secondary" className="text-[10px]">
                                {m.predictions[0].mainDirection === "home_win" ? "主胜" :
                                 m.predictions[0].mainDirection === "away_win" ? "客胜" : "平局"}
                              </Badge>
                              {riskBadge(m.predictions[0].riskLevel)}
                            </>
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
                )
              })}
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
