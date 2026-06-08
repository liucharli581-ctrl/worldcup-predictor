"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft, TrendingUp, DollarSign, ClipboardCheck, AlertTriangle, Info, BarChart3, ShieldAlert, History } from "lucide-react"
import { TeamFlag } from "@/components/team-flag"
import { predictMatch, confidenceLabel, upsetLabel, confidenceColor, upsetColor, type TeamStats, type PredictionResult } from "@/lib/predict-match"

interface TeamInfo {
  id: string
  name: string
  fifaCode: string
  country: string | null
}

interface MatchDetail {
  id: string
  competition: string
  matchStage: string
  matchDate: string
  status: string
  neutralGround: boolean
  homeTeam: TeamInfo
  awayTeam: TeamInfo
  homeScore?: number | null
  awayScore?: number | null
  actualResult?: string | null
  oddsRecords: OddsRecord[]
  predictions: Prediction[]
  reviews: Review[]
}

interface OddsRecord {
  id: string
  bookmaker: string
  initialHomeWin: number
  initialDraw: number
  initialAwayWin: number
  currentHomeWin: number
  currentDraw: number
  currentAwayWin: number
  homeChange: number
  drawChange: number
  awayChange: number
  isMajorBookmaker: boolean
  isAbnormal: boolean
}

interface Prediction {
  id: string
  homeWinProbability: number
  drawProbability: number
  awayWinProbability: number
  mainDirection: string
  marketScore: number
  marketDirection: string
  bookmakerConsistency: string
  riskScore: number
  riskLevel: string
  riskReasons: string[]
  suggestedBet: string
  report: string
  createdAt: string
  virtualSimulation?: {
    id: string
    recommendedStake: number
    expectedReturn: number
    riskLevel: string
  } | null
}

interface Review {
  id: string
  predictionHit: boolean
  actualResult: string
  predictedResult: string
  probabilityError: number
  reviewSummary: string
  createdAt: string
}

export default function MatchDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [match, setMatch] = useState<MatchDetail | null>(null)
  const [allTeams, setAllTeams] = useState<TeamStats[]>([])
  const [loading, setLoading] = useState(true)
  const [predicting, setPredicting] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/matches/${params.id}`).then((r) => r.json()),
      fetch("/api/teams").then((r) => r.json()),
    ])
      .then(([matchRes, teamsRes]) => {
        setMatch(matchRes.data ?? null)
        setAllTeams(teamsRes.data ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [params.id])

  const prediction = useMemo<PredictionResult | null>(() => {
    if (!match || match.status !== "scheduled" || allTeams.length === 0) return null
    const home = allTeams.find((t) => t.fifaCode === match.homeTeam.fifaCode)
    const away = allTeams.find((t) => t.fifaCode === match.awayTeam.fifaCode)
    if (!home || !away) return null

    const isGroup = match.matchStage?.startsWith("Group")
    return predictMatch(home, away, isGroup)
  }, [match, allTeams])

  const handlePredict = async () => {
    setPredicting(true)
    try {
      const res = await fetch(`/api/matches/${params.id}/predict`, { method: "POST" })
      const data = await res.json()
      if (data.success) {
        const r = await fetch(`/api/matches/${params.id}`)
        const rd = await r.json()
        setMatch(rd.data ?? null)
      }
    } catch {
      // ignore
    } finally {
      setPredicting(false)
    }
  }

  const riskColor = (level: string) => {
    const map: Record<string, string> = {
      low: "text-green-600",
      medium_low: "text-lime-600",
      medium: "text-yellow-600",
      medium_high: "text-orange-600",
      high: "text-red-600",
      extreme: "text-red-700 font-bold",
    }
    return map[level] ?? ""
  }

  const riskLabel = (level: string) => {
    const map: Record<string, string> = {
      low: "低风险",
      medium_low: "中低风险",
      medium: "中等风险",
      medium_high: "中高风险",
      high: "高风险",
      extreme: "极高风险",
    }
    return map[level] ?? level
  }

  if (loading) return <p className="text-sm text-muted-foreground">加载中...</p>
  if (!match) return <p className="text-sm text-muted-foreground">比赛未找到</p>

  const latestPrediction = match.predictions?.[0] ?? null
  const latestReview = match.reviews?.[0] ?? null

  const isUpcoming = match.status === "scheduled"

  return (
    <div className="space-y-6">
      <Link href="/matches" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        返回比赛列表
      </Link>

      {/* 比赛基础信息 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="flex flex-1 flex-col items-center sm:items-end">
              <span className="flex items-center gap-1.5 text-lg font-bold">
                <TeamFlag fifaCode={match.homeTeam.fifaCode} country={match.homeTeam.country} size={28} />
                {match.homeTeam.name}
              </span>
              <Badge variant="outline" className="mt-0.5 font-mono">
                {match.homeTeam.fifaCode}
              </Badge>
            </div>
            <div className="flex flex-col items-center gap-1">
              {match.status === "completed" && match.homeScore != null ? (
                <span className="text-3xl font-extrabold tabular-nums">
                  {match.homeScore} : {match.awayScore}
                </span>
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">VS</span>
              )}
              <span className="text-xs text-muted-foreground">{match.matchStage}</span>
              {match.competition && (
                <span className="text-xs text-muted-foreground">{match.competition}</span>
              )}
              <span className="text-xs text-muted-foreground">
                {new Date(match.matchDate).toLocaleString("zh-CN")}
              </span>
              {isUpcoming && (
                <Badge variant="secondary" className="text-[10px]">未开始</Badge>
              )}
              {match.neutralGround && (
                <Badge variant="secondary" className="text-[10px]">中立场地</Badge>
              )}
            </div>
            <div className="flex flex-1 flex-col items-center sm:items-start">
              <span className="flex items-center gap-1.5 text-lg font-bold">
                <TeamFlag fifaCode={match.awayTeam.fifaCode} country={match.awayTeam.country} size={28} />
                {match.awayTeam.name}
              </span>
              <Badge variant="outline" className="mt-0.5 font-mono">
                {match.awayTeam.fifaCode}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 赛前预测卡片（仅未开始比赛） */}
      {isUpcoming && prediction && (
        <>
          {/* 核心预测 */}
          <Card className="border-amber-200 dark:border-amber-800/30">
            <CardHeader className="border-b border-amber-100 dark:border-amber-900/20">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-amber-500" />
                赛前预测分析
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              {/* 预测结果头 */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">综合预测：</span>
                  <span className="text-lg font-bold text-amber-700 dark:text-amber-400">
                    {prediction.mainDirection}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">预测比分：</span>
                  <span className="text-lg font-bold tabular-nums">{prediction.predictedScore}</span>
                </div>
              </div>

              {/* 胜平负概率 */}
              <div>
                <div className="mb-2 text-sm text-muted-foreground">胜平负概率</div>
                <div className="flex h-8 w-full overflow-hidden rounded-lg">
                  <div
                    className="flex items-center justify-center bg-green-500 text-xs font-bold text-white transition-all"
                    style={{ width: `${prediction.homeWinProb}%` }}
                  >
                    {prediction.homeWinProb > 8 ? `${prediction.homeWinProb}%` : ""}
                  </div>
                  <div
                    className="flex items-center justify-center bg-yellow-400 text-xs font-bold text-white transition-all"
                    style={{ width: `${prediction.drawProb}%` }}
                  >
                    {prediction.drawProb > 8 ? `${prediction.drawProb}%` : ""}
                  </div>
                  <div
                    className="flex items-center justify-center bg-blue-500 text-xs font-bold text-white transition-all"
                    style={{ width: `${prediction.awayWinProb}%` }}
                  >
                    {prediction.awayWinProb > 8 ? `${prediction.awayWinProb}%` : ""}
                  </div>
                </div>
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span className="text-green-600 font-medium">{match.homeTeam.name} 胜</span>
                  <span className="text-yellow-600 font-medium">平局</span>
                  <span className="text-blue-600 font-medium">{match.awayTeam.name} 胜</span>
                </div>
              </div>

              {/* 信心 & 冷门 */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xs text-muted-foreground">信心等级</div>
                  <div className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${confidenceColor(prediction.confidence)}`}>
                    {confidenceLabel[prediction.confidence]}
                  </div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xs text-muted-foreground">冷门指数</div>
                  <div className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${upsetColor(prediction.upsetIndex)}`}>
                    {upsetLabel[prediction.upsetIndex]}
                  </div>
                </div>
                <div className="rounded-lg border p-3 text-center sm:col-span-2">
                  <div className="text-xs text-muted-foreground">推荐判断方向</div>
                  <div className="mt-1 text-sm font-semibold">
                    {prediction.mainDirection}
                  </div>
                </div>
              </div>

              {/* 预测摘要 */}
              <div className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
                {prediction.summary}
              </div>
            </CardContent>
          </Card>

          {/* 影响因素拆解 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                影响因素拆解
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-4 py-3 font-medium">因素</th>
                      <th className="px-4 py-3 font-medium text-right">{match.homeTeam.name}</th>
                      <th className="px-4 py-3 font-medium text-center"></th>
                      <th className="px-4 py-3 font-medium text-left">{match.awayTeam.name}</th>
                      <th className="px-4 py-3 font-medium text-left hidden sm:table-cell">倾向</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prediction.factors.map((f) => (
                      <tr key={f.label} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{f.label}</td>
                        <td className={`px-4 py-3 text-right font-mono tabular-nums ${f.advantage === "home" ? "font-semibold text-amber-700 dark:text-amber-400" : ""}`}>
                          {f.homeValue}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {f.advantage === "home" ? (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">✓</span>
                          ) : f.advantage === "away" ? (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">✓</span>
                          ) : (
                            <span className="text-muted-foreground text-[10px]">—</span>
                          )}
                        </td>
                        <td className={`px-4 py-3 font-mono tabular-nums ${f.advantage === "away" ? "font-semibold text-blue-700 dark:text-blue-400" : ""}`}>
                          {f.awayValue}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{f.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 风险提醒 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="h-4 w-4 text-orange-500" />
                风险提醒
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {prediction.riskPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
                    <span className="text-muted-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* 结论 */}
          <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 dark:border-amber-800/30">
            <CardContent className="flex items-start gap-3 py-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <div className="text-sm font-semibold text-amber-800 dark:text-amber-300">模型结论</div>
                <div className="mt-0.5 text-sm text-amber-700 dark:text-amber-400">
                  {prediction.conclusion}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* 详细分析标签页 */}
      <Tabs defaultValue={match.status === "completed" ? "review" : "odds"}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="odds" className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5" />
            赔率
          </TabsTrigger>
          <TabsTrigger value="prediction" className="flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            预测
          </TabsTrigger>
          <TabsTrigger value="simulation" className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5" />
            模拟
          </TabsTrigger>
          <TabsTrigger value="h2h" className="flex items-center gap-1">
            <History className="h-3.5 w-3.5" />
            交锋
          </TabsTrigger>
          <TabsTrigger value="review" className="flex items-center gap-1">
            <ClipboardCheck className="h-3.5 w-3.5" />
            复盘
          </TabsTrigger>
        </TabsList>

        <TabsContent value="odds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">赔率数据</CardTitle>
            </CardHeader>
            <CardContent>
              {(match.oddsRecords ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无赔率数据</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">博彩公司</th>
                        <th className="pb-2 pr-4 font-medium">主胜</th>
                        <th className="pb-2 pr-4 font-medium">平局</th>
                        <th className="pb-2 pr-4 font-medium">客胜</th>
                        <th className="pb-2 pr-4 font-medium">主胜变化</th>
                        <th className="pb-2 pr-4 font-medium">平局变化</th>
                        <th className="pb-2 pr-4 font-medium">客胜变化</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(match.oddsRecords ?? []).map((o) => (
                        <tr key={o.id} className="border-b last:border-0">
                          <td className="py-2 pr-4">
                            <span className="font-medium">{o.bookmaker}</span>
                            {o.isMajorBookmaker && (
                              <Badge variant="secondary" className="ml-1 text-[10px]">
                                主流
                              </Badge>
                            )}
                          </td>
                          <td className={`py-2 pr-4 font-mono tabular-nums ${o.isAbnormal ? "text-red-600 font-bold" : ""}`}>
                            {o.currentHomeWin.toFixed(2)}
                          </td>
                          <td className="py-2 pr-4 font-mono tabular-nums">{o.currentDraw.toFixed(2)}</td>
                          <td className="py-2 pr-4 font-mono tabular-nums">{o.currentAwayWin.toFixed(2)}</td>
                          <td className={`py-2 pr-4 font-mono tabular-nums ${o.homeChange > 0 ? "text-green-600" : o.homeChange < 0 ? "text-red-600" : ""}`}>
                            {o.homeChange > 0 ? "+" : ""}{o.homeChange.toFixed(2)}
                          </td>
                          <td className={`py-2 pr-4 font-mono tabular-nums ${o.drawChange > 0 ? "text-green-600" : o.drawChange < 0 ? "text-red-600" : ""}`}>
                            {o.drawChange > 0 ? "+" : ""}{o.drawChange.toFixed(2)}
                          </td>
                          <td className={`py-2 font-mono tabular-nums ${o.awayChange > 0 ? "text-green-600" : o.awayChange < 0 ? "text-red-600" : ""}`}>
                            {o.awayChange > 0 ? "+" : ""}{o.awayChange.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prediction" className="space-y-4">
          {!latestPrediction ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12">
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">尚未生成预测</p>
                <Button onClick={handlePredict} disabled={predicting}>
                  {predicting ? "预测中..." : "生成预测"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">概率预测</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-950/20">
                      <div className="text-xs text-muted-foreground">主胜</div>
                      <div className="mt-1 text-2xl font-bold text-green-700 dark:text-green-400">
                        {latestPrediction.homeWinProbability}%
                      </div>
                    </div>
                    <div className="rounded-lg bg-yellow-50 p-4 text-center dark:bg-yellow-950/20">
                      <div className="text-xs text-muted-foreground">平局</div>
                      <div className="mt-1 text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                        {latestPrediction.drawProbability}%
                      </div>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-4 text-center dark:bg-blue-950/20">
                      <div className="text-xs text-muted-foreground">客胜</div>
                      <div className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-400">
                        {latestPrediction.awayWinProbability}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">市场分析</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">市场方向</span>
                      <span className="font-medium">{latestPrediction.marketDirection === "home" ? "倾向主队" : latestPrediction.marketDirection === "away" ? "倾向客队" : "无明显倾向"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">博彩公司一致性</span>
                      <span className="font-medium">{latestPrediction.bookmakerConsistency === "high" ? "高度一致" : latestPrediction.bookmakerConsistency === "medium_high" ? "较高" : latestPrediction.bookmakerConsistency === "medium" ? "中等" : "较低"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">市场评分</span>
                      <span className="font-medium">{latestPrediction.marketScore}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">分析结论</span>
                      <span className="font-medium">{latestPrediction.mainDirection === "home" ? "推荐主胜" : latestPrediction.mainDirection === "away" ? "推荐客胜" : "推荐平局"}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">风险评估</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">风险评分</span>
                      <span className="font-medium">{latestPrediction.riskScore}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">风险等级</span>
                      <span className={`font-medium ${riskColor(latestPrediction.riskLevel)}`}>
                        {riskLabel(latestPrediction.riskLevel)}
                      </span>
                    </div>
                    {latestPrediction.riskReasons.length > 0 && (
                      <div className="pt-1">
                        <div className="mb-1 text-muted-foreground">风险因素:</div>
                        <ul className="list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                          {latestPrediction.riskReasons.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">分析报告</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
                    {latestPrediction.report}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="simulation" className="space-y-4">
          <VirtualSimulation matchId={match.id} latestPrediction={latestPrediction} />
        </TabsContent>

        <TabsContent value="h2h" className="space-y-4">
          <HeadToHeadCard matchId={match.id} homeTeam={match.homeTeam} awayTeam={match.awayTeam} />
        </TabsContent>

        <TabsContent value="review" className="space-y-4">
          {match.status === "completed" && latestReview ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">复盘结果</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 rounded-lg border p-3 text-center">
                    <div className="text-xs text-muted-foreground">预测方向</div>
                    <div className="mt-1 text-sm font-semibold">
                      {latestReview.predictedResult === "home_win" ? "主胜" : latestReview.predictedResult === "away_win" ? "客胜" : "平局"}
                    </div>
                  </div>
                  <div className="flex-1 rounded-lg border p-3 text-center">
                    <div className="text-xs text-muted-foreground">实际结果</div>
                    <div className="mt-1 text-sm font-semibold">
                      {latestReview.actualResult === "home_win" ? "主胜" : latestReview.actualResult === "away_win" ? "客胜" : "平局"}
                    </div>
                  </div>
                  <div className="flex-1 rounded-lg border p-3 text-center">
                    <div className="text-xs text-muted-foreground">命中</div>
                    <div className={`mt-1 text-sm font-semibold ${latestReview.predictionHit ? "text-green-600" : "text-red-600"}`}>
                      {latestReview.predictionHit ? "是" : "否"}
                    </div>
                  </div>
                </div>
                <div className="text-sm">{latestReview.reviewSummary}</div>
              </CardContent>
            </Card>
          ) : match.status === "completed" ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12">
                <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">比赛已结束，暂无复盘数据</p>
                <Button onClick={() => router.push(`/matches/${match.id}/review`)}>
                  创建复盘
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12">
                <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">比赛尚未结束，暂无复盘数据</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* 免责声明 */}
      <div className="rounded-lg bg-muted/30 p-3 text-center text-xs text-muted-foreground">
        足球比赛数据预测助手，仅供娱乐与数据分析参考，不构成任何投注建议。
      </div>
    </div>
  )
}

interface H2HRecord {
  id: string
  homeTeamName: string
  awayTeamName: string
  homeScore: number
  awayScore: number
  matchDate: string
  competition: string | null
  stage: string | null
}

function HeadToHeadCard({
  matchId,
  homeTeam,
  awayTeam,
}: {
  matchId: string
  homeTeam: TeamInfo
  awayTeam: TeamInfo
}) {
  const [records, setRecords] = useState<H2HRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/matches/${matchId}/h2h`)
      .then((r) => r.json())
      .then((res) => setRecords(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [matchId])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          加载中...
        </CardContent>
      </Card>
    )
  }

  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <History className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">暂无历史交锋数据</p>
        </CardContent>
      </Card>
    )
  }

  const homeWins = records.filter(
    (r) => (r.homeTeamName === homeTeam.name && r.homeScore > r.awayScore) ||
           (r.awayTeamName === homeTeam.name && r.awayScore > r.homeScore)
  ).length
  const awayWins = records.filter(
    (r) => (r.awayTeamName === awayTeam.name && r.awayScore > r.homeScore) ||
           (r.homeTeamName === awayTeam.name && r.homeScore > r.awayScore)
  ).length
  const draws = records.length - homeWins - awayWins

  return (
    <div className="space-y-4">
      {/* 交锋战绩汇总 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">历史交锋战绩</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-lg bg-green-50 p-4 dark:bg-green-950/20">
              <div className="text-xs text-muted-foreground">{homeTeam.name} 胜</div>
              <div className="mt-1 text-2xl font-bold text-green-700 dark:text-green-400">{homeWins}</div>
            </div>
            <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-950/20">
              <div className="text-xs text-muted-foreground">平局</div>
              <div className="mt-1 text-2xl font-bold text-yellow-700 dark:text-yellow-400">{draws}</div>
            </div>
            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/20">
              <div className="text-xs text-muted-foreground">{awayTeam.name} 胜</div>
              <div className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-400">{awayWins}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 交锋记录列表 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">日期</th>
                  <th className="px-4 py-3 font-medium">赛事</th>
                  <th className="px-4 py-3 font-medium">阶段</th>
                  <th className="px-4 py-3 font-medium text-right">主队</th>
                  <th className="px-4 py-3 font-medium text-center">比分</th>
                  <th className="px-4 py-3 font-medium text-left">客队</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const isHomeCurrent = r.homeTeamName === homeTeam.name
                  const isAwayCurrent = r.awayTeamName === awayTeam.name
                  const isSamePairing = isHomeCurrent && isAwayCurrent
                  return (
                    <tr
                      key={r.id}
                      className={`border-b last:border-0 hover:bg-muted/30 ${isSamePairing ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {new Date(r.matchDate).toLocaleDateString("zh-CN")}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.competition ?? "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.stage ?? "-"}</td>
                      <td className={`px-4 py-3 text-right font-medium ${isHomeCurrent ? "text-amber-700 dark:text-amber-400" : ""}`}>
                        {r.homeTeamName}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold tabular-nums">
                        {r.homeScore} : {r.awayScore}
                      </td>
                      <td className={`px-4 py-3 font-medium ${isAwayCurrent ? "text-blue-700 dark:text-blue-400" : ""}`}>
                        {r.awayTeamName}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {records.some((r) => r.homeTeamName === homeTeam.name && r.awayTeamName === awayTeam.name) && (
        <div className="rounded-lg bg-amber-50/50 p-3 text-center text-xs text-muted-foreground dark:bg-amber-950/10">
          高亮行表示与当前比赛相同对阵（主客相同）
        </div>
      )}
    </div>
  )
}

function VirtualSimulation({
  matchId,
  latestPrediction,
}: {
  matchId: string
  latestPrediction: Prediction | null
}) {
  const [bankroll, setBankroll] = useState("10000")
  const [result, setResult] = useState<{
    recommendedStake: number
    expectedReturn: number
    riskLevel: string
    stakePercent: number
  } | null>(null)
  const [simulating, setSimulating] = useState(false)

  const handleSimulate = async () => {
    setSimulating(true)
    try {
      const res = await fetch(`/api/matches/${matchId}/virtual-simulation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankroll: Number(bankroll) }),
      })
      const data = await res.json()
      if (data.success) {
        setResult(data.data)
      }
    } catch {
      // ignore
    } finally {
      setSimulating(false)
    }
  }

  const riskColor = (level: string) => {
    const map: Record<string, string> = {
      low: "text-green-600",
      medium_low: "text-lime-600",
      medium: "text-yellow-600",
      medium_high: "text-orange-600",
      high: "text-red-600",
      extreme: "text-red-700 font-bold",
    }
    return map[level] ?? ""
  }
  const riskLabel = (level: string) => {
    const map: Record<string, string> = {
      low: "低风险",
      medium_low: "中低风险",
      medium: "中等风险",
      medium_high: "中高风险",
      high: "高风险",
      extreme: "极高风险",
    }
    return map[level] ?? level
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">虚拟投注模拟</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!latestPrediction ? (
          <p className="text-sm text-muted-foreground">请先生成预测</p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={bankroll}
                onChange={(e) => setBankroll(e.target.value)}
                className="flex h-9 w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                placeholder="本金"
              />
              <Button onClick={handleSimulate} disabled={simulating}>
                {simulating ? "计算中..." : "开始模拟"}
              </Button>
            </div>

            {result && (
              <div className="rounded-lg border p-4">
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <div className="text-muted-foreground">建议投注金额</div>
                    <div className="mt-1 text-lg font-bold">
                      ${result.recommendedStake.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ({result.stakePercent}% 本金)
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">预期回报</div>
                    <div className="mt-1 text-lg font-bold">
                      ${result.expectedReturn.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">风险等级</div>
                    <div className={`mt-1 text-lg font-bold ${riskColor(result.riskLevel)}`}>
                      {riskLabel(result.riskLevel)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/20 dark:text-amber-400">
              <strong>风险提示：</strong>本模拟仅供参考，不构成任何投注建议。足球比赛结果具有不确定性，请理性决策。
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
