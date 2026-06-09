"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, TrendingUp, ClipboardCheck, AlertTriangle } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, ComposedChart, Line,
} from "recharts"

interface Review {
  id: string
  predictionHit: boolean
  actualResult: string
  predictedResult: string
  probabilityError: number
  reviewSummary: string
  createdAt: string
  match: {
    id: string
    homeTeam: { id: string; name: string }
    awayTeam: { id: string; name: string }
  }
}

interface RiskLevelStat {
  riskLevel: string
  total: number
  hits: number
  hitRate: number
}

interface CalibrationPoint {
  range: string
  predictedAvg: number
  actualRate: number
  count: number
}

interface ReviewStats {
  totalReviews: number
  overallHitRate: number
  byRiskLevel: RiskLevelStat[]
  calibration: CalibrationPoint[]
  totalPredictions: number
  avgProbabilityError: number
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    fetch("/api/reviews")
      .then((r) => r.json())
      .then((res) => setReviews(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetch("/api/reviews/stats")
      .then((r) => r.json())
      .then((res) => setStats(res.data ?? null))
      .catch(() => {})
      .finally(() => setStatsLoading(false))
  }, [])

  const resultLabel = (r: string) => {
    const map: Record<string, string> = {
      home_win: "主胜",
      away_win: "客胜",
      draw: "平局",
    }
    return map[r] ?? r
  }

  const riskBadgeVariant = (level: string) => {
    const lower = level.toLowerCase()
    if (lower.includes("低") || lower === "low" || lower === "low_risk") return "secondary" as const
    if (lower.includes("高") || lower === "high" || lower === "high_risk") return "destructive" as const
    return "outline" as const
  }

  const CalibrationTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null
    const data = payload[0]?.payload
    return (
      <div className="rounded-lg border bg-background p-3 shadow-sm">
        <p className="text-sm font-medium mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="text-xs" style={{ color: p.color }}>
            {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}%
          </p>
        ))}
        {data?.count !== undefined && (
          <p className="mt-1 text-xs text-muted-foreground">样本数: {data.count}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">复盘记录</h1>
        <p className="text-muted-foreground">查看历史预测复盘结果</p>
      </div>

      {/* Stats Dashboard */}
      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats && stats.totalReviews > 0 ? (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900">
                  <ClipboardCheck className="h-6 w-6 text-blue-700 dark:text-blue-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">总复盘数</p>
                  <p className="text-2xl font-bold">{stats.totalReviews}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div
                  className={`rounded-lg p-3 ${stats.overallHitRate > 50 ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"}`}
                >
                  <TrendingUp
                    className={`h-6 w-6 ${stats.overallHitRate > 50 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">整体命中率</p>
                  <p
                    className={`text-2xl font-bold ${stats.overallHitRate > 50 ? "text-green-600" : "text-red-600"}`}
                  >
                    {stats.overallHitRate.toFixed(1)}%
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900">
                  <AlertTriangle className="h-6 w-6 text-amber-700 dark:text-amber-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">平均概率误差</p>
                  <p className="text-2xl font-bold">{stats.avgProbabilityError.toFixed(1)}%</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900">
                  <BarChart3 className="h-6 w-6 text-purple-700 dark:text-purple-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">总预测数</p>
                  <p className="text-2xl font-bold">{stats.totalPredictions}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Level Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">风险等级命中率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 font-medium">风险等级</th>
                      <th className="pb-3 font-medium">总数</th>
                      <th className="pb-3 font-medium">命中</th>
                      <th className="pb-3 font-medium">命中率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byRiskLevel.map((r) => (
                      <tr key={r.riskLevel} className="border-b last:border-0">
                        <td className="py-3">
                          <Badge variant={riskBadgeVariant(r.riskLevel)}>
                            {r.riskLevel}
                          </Badge>
                        </td>
                        <td className="py-3">{r.total}</td>
                        <td className="py-3">{r.hits}</td>
                        <td className="py-3">
                          <span
                            className={
                              r.hitRate > 50
                                ? "font-medium text-green-600"
                                : "font-medium text-red-600"
                            }
                          >
                            {r.hitRate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Calibration Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">校准分析</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={stats.calibration}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip content={<CalibrationTooltip />} />
                  <Legend />
                  <Bar dataKey="predictedAvg" name="预测概率" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actualRate" name="实际命中率" fill="#10b981" radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
              <p className="mt-2 text-xs text-muted-foreground">
                校准图展示模型预测概率与实际命中率之间的关系。两柱越接近，模型校准越好。
              </p>
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* Review List */}
      {loading ? (
        <p className="text-sm text-muted-foreground">加载中...</p>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12">
            <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">暂无复盘记录</p>
            <p className="text-xs text-muted-foreground">
              在比赛详情页提交实际比分后会自动创建复盘
            </p>
          </CardContent>
        </Card>
      ) : (
        <div>
          <h2 className="mb-3 text-lg font-semibold">复盘列表</h2>
          <div className="space-y-3">
            {reviews.map((r) => (
              <Link key={r.id} href={`/matches/${r.match.id}`}>
                <Card className="transition-colors hover:bg-accent">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">
                          {r.match.homeTeam.name} vs {r.match.awayTeam.name}
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            预测: {resultLabel(r.predictedResult)} | 实际: {resultLabel(r.actualResult)}
                          </span>
                          <span>概率误差: {r.probabilityError}%</span>
                        </div>
                      </div>
                      <Badge variant={r.predictionHit ? "default" : "destructive"}>
                        {r.predictionHit ? "命中" : "未命中"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
