"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { TeamFlag } from "@/components/team-flag"

interface TeamDetail {
  id: string
  name: string
  fifaCode: string
  country: string
  fifaRanking: number
  eloRating: number
  worldCupAppearances: number
  worldCupTitles: number
  bestWorldCupResult: string
  totalMatches: number
  totalWins: number
  totalDraws: number
  totalLosses: number
  goalsFor: number
  goalsAgainst: number
  recent5Wins: number
  recent5Draws: number
  recent5Losses: number
  recent10Wins: number
  recent10Draws: number
  recent10Losses: number
  avgGoalsFor: number
  avgGoalsAgainst: number
  injuryScore: number
}

export default function TeamDetailPage() {
  const params = useParams()
  const [team, setTeam] = useState<TeamDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/teams/${params.id}`)
      .then((r) => r.json())
      .then((res) => setTeam(res.data ?? null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) return <p className="text-sm text-muted-foreground">加载中...</p>
  if (!team) return <p className="text-sm text-muted-foreground">球队未找到</p>

  const winRate = team.totalMatches > 0 ? ((team.totalWins / team.totalMatches) * 100).toFixed(1) : "0"
  const recent5Form = `${team.recent5Wins}胜 ${team.recent5Draws}平 ${team.recent5Losses}负`
  const recent10Form = `${team.recent10Wins}胜 ${team.recent10Draws}平 ${team.recent10Losses}负`

  return (
    <div className="space-y-6">
      <Link href="/teams" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        返回球队列表
      </Link>

      <div className="flex items-center gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <TeamFlag fifaCode={team.fifaCode} country={team.country} size={36} />
            {team.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {team.country} · FIFA {team.fifaCode} · 排名 #{team.fifaRanking}
          </p>
        </div>
        <Badge variant="outline" className="ml-auto text-lg font-mono">
          {team.fifaCode}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">基础数据</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="text-muted-foreground">Elo 评分</div>
              <dd className="font-semibold text-right">{team.eloRating}</dd>
              <div className="text-muted-foreground">世界杯次数</div>
              <dd className="font-semibold text-right">{team.worldCupAppearances} 次</dd>
              <div className="text-muted-foreground">世界杯冠军</div>
              <dd className="font-semibold text-right">{team.worldCupTitles} 次</dd>
              <div className="text-muted-foreground">最佳战绩</div>
              <dd className="font-semibold text-right">{team.bestWorldCupResult}</dd>
              <div className="text-muted-foreground">总场次</div>
              <dd className="font-semibold text-right">{team.totalMatches}</dd>
              <div className="text-muted-foreground">胜率</div>
              <dd className="font-semibold text-right">{winRate}%</dd>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">近期状态</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1 text-sm text-muted-foreground">近 5 场</div>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => {
                  const isWin = i < team.recent5Wins
                  const isDraw = i < team.recent5Wins + team.recent5Draws && !isWin
                  return (
                    <div
                      key={i}
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        isWin
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : isDraw
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {isWin ? "W" : isDraw ? "D" : "L"}
                    </div>
                  )
                })}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{recent5Form}</div>
            </div>
            <div>
              <div className="mb-1 text-sm text-muted-foreground">近 10 场</div>
              <div className="flex gap-1">
                {Array.from({ length: 10 }).map((_, i) => {
                  const isWin = i < team.recent10Wins
                  const isDraw = i < team.recent10Wins + team.recent10Draws && !isWin
                  return (
                    <div
                      key={i}
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isWin
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : isDraw
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {isWin ? "W" : isDraw ? "D" : "L"}
                    </div>
                  )
                })}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{recent10Form}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">攻防数据</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="text-muted-foreground">总进球</div>
              <dd className="font-semibold text-right">{team.goalsFor}</dd>
              <div className="text-muted-foreground">总失球</div>
              <dd className="font-semibold text-right">{team.goalsAgainst}</dd>
              <div className="text-muted-foreground">场均进球</div>
              <dd className="font-semibold text-right">{team.avgGoalsFor}</dd>
              <div className="text-muted-foreground">场均失球</div>
              <dd className="font-semibold text-right">{team.avgGoalsAgainst}</dd>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">伤病情况</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">伤病评分:</span>
              <span className={`font-semibold ${team.injuryScore < -3 ? "text-red-600" : team.injuryScore > 0 ? "text-green-600" : ""}`}>
                {team.injuryScore}
              </span>
              <span className="text-xs text-muted-foreground">
                （负数表示有伤病影响，正数表示阵容齐整）
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
