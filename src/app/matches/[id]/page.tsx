"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft, TrendingUp, DollarSign, ClipboardCheck,
  AlertTriangle, BarChart3, ShieldAlert, History,
  Scale, Target, BrainCircuit, Goal,
} from "lucide-react"
import { TeamFlag } from "@/components/team-flag"
import { predictMatch, confidenceLabel, confidenceColor, type TeamStats, type PredictionResult } from "@/lib/predict-match"
import type { H2HAnalysis, CorrectScoreItem } from "@/lib/analysis"
import type { ScorePrediction } from "@/lib/correct-score-predictor"

interface TeamInfo {
  id: string
  name: string
  fifaCode: string | null
  country: string | null
}

interface ServerPrediction {
  id: string
  modelVersion: string | null
  homeBaseScore: number | null
  awayBaseScore: number | null
  marketScore: number | null
  homeWinProbability: number
  drawProbability: number
  awayWinProbability: number
  mainDirection: string | null
  confidence: string | null
  riskLevel: string | null
  riskReasons: string | null
  reportText: string | null
  homeValueEv: number | null
  drawValueEv: number | null
  awayValueEv: number | null
  homeValueSignal: string | null
  drawValueSignal: string | null
  awayValueSignal: string | null
  createdAt: string
}

interface ServerMatch {
  id: string
  competition: string | null
  matchStage: string | null
  matchDate: string
  status: string
  neutralGround: boolean
  actualHomeScore: number | null
  actualAwayScore: number | null
  actualResult: string | null
  homeTeam: {
    id: string
    name: string
    fifaCode: string | null
    country: string | null
    baseScore: number | null
    formLabel: string | null
  }
  awayTeam: {
    id: string
    name: string
    fifaCode: string | null
    country: string | null
    baseScore: number | null
    formLabel: string | null
  }
  odds: OddsRecord[]
  predictions: ServerPrediction[]
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
  homeChange: number | null
  drawChange: number | null
  awayChange: number | null
  isMajorBookmaker: boolean
  isAbnormal: boolean
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

interface H2HApiResponse {
  records: H2HRecord[]
  analysis: H2HAnalysis | null
}

interface CorrectScoreApiItem {
  id: string
  score: string
  odds: number
  bookmaker: string
}

interface ModelPredictionResult {
  predictions: ScorePrediction[]
  outcomeSummary: {
    homeWin: number
    draw: number
    awayWin: number
  }
  modelConfidence: number
}

interface CorrectScoreApiResponse {
  items: CorrectScoreApiItem[]
  analysis: CorrectScoreItem[]
  modelPrediction?: ModelPredictionResult
}

function parseRiskReasons(reasons: string | null | undefined): string[] {
  if (!reasons) return []
  try { return JSON.parse(reasons) } catch { return [] }
}

function getValueSignalColor(signal: string | null): string {
  if (signal === "positive") return "text-green-600 bg-green-50 dark:bg-green-950/20 dark:text-green-400 border-green-200"
  if (signal === "negative") return "text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400 border-red-200"
  return "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 dark:text-yellow-400 border-yellow-200"
}

function getValueSignalLabel(signal: string | null): string {
  if (signal === "positive") return "正价值"
  if (signal === "negative") return "负价值"
  return "中性"
}

function RiskBadge({ level }: { level: string | null }) {
  if (!level) return null
  const map: Record<string, { color: string; label: string }> = {
    low: { color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", label: "低风险" },
    medium_low: { color: "bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-400", label: "中低风险" },
    medium: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", label: "中等风险" },
    medium_high: { color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400", label: "中高风险" },
    high: { color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", label: "高风险" },
    extreme: { color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 font-bold", label: "极高风险" },
  }
  const m = map[level] ?? { color: "bg-gray-100 text-gray-800", label: level }
  return <Badge className={m.color}>{m.label}</Badge>
}

export default function MatchDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [match, setMatch] = useState<ServerMatch | null>(null)
  const [allTeams, setAllTeams] = useState<TeamStats[]>([])
  const [loading, setLoading] = useState(true)
  const [predicting, setPredicting] = useState(false)
  const [h2hRecords, setH2hRecords] = useState<H2HRecord[]>([])
  const [h2hAnalysis, setH2hAnalysis] = useState<H2HAnalysis | null>(null)
  const [h2hLoading, setH2hLoading] = useState(true)
  const [csItems, setCsItems] = useState<CorrectScoreItem[]>([])
  const [csLoading, setCsLoading] = useState(true)
  const [modelPrediction, setModelPrediction] = useState<ModelPredictionResult | null>(null)

  // 加载比赛+球队数据
  useEffect(() => {
    Promise.all([
      fetch(`/api/matches/${params.id}`).then((r) => r.json()),
      fetch("/api/teams").then((r) => r.json()),
    ])
      .then(([matchRes, teamsRes]) => {
        const m = matchRes.data ?? null
        setMatch(m)
        setAllTeams(teamsRes.data ?? [])
        // 自动生成预测（比赛未开始且尚无预测时）
        if (m && m.status === "scheduled" && (!m.predictions || m.predictions.length === 0)) {
          fetch(`/api/matches/${params.id}/predict`, { method: "POST" })
            .then((r) => r.json())
            .then((res) => {
              if (res.success) {
                fetch(`/api/matches/${params.id}`).then((r2) => r2.json())
                  .then((r2res) => setMatch(r2res.data ?? null))
              }
            })
            .catch(() => {})
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [params.id])

  // 加载交锋数据
  useEffect(() => {
    if (!params.id) return
    Promise.all([
      fetch(`/api/matches/${params.id}/h2h`).then((r) => r.json()),
      fetch(`/api/matches/${params.id}/correct-scores`).then((r) => r.json()),
    ])
      .then(([h2hRes, csRes]) => {
        const data = h2hRes.data as H2HApiResponse | undefined
        setH2hRecords(data?.records ?? [])
        setH2hAnalysis(data?.analysis ?? null)
        const csData = csRes.data as CorrectScoreApiResponse | undefined
        setCsItems(csData?.analysis ?? [])
        setModelPrediction(csData?.modelPrediction ?? null)
      })
      .catch(() => {})
      .finally(() => { setH2hLoading(false); setCsLoading(false) })
  }, [params.id])

  // 客户端预测（作为无服务端预测时的后备）
  const clientPrediction = useMemo<PredictionResult | null>(() => {
    if (!match || match.status !== "scheduled" || allTeams.length === 0) return null
    const home = allTeams.find((t) => t.fifaCode === match.homeTeam.fifaCode)
    const away = allTeams.find((t) => t.fifaCode === match.awayTeam.fifaCode)
    if (!home || !away) return null
    const isGroup = match.matchStage?.startsWith("Group")
    const pm = predictMatch(home, away, !!isGroup)
    return pm
  }, [match, allTeams])

  const isUpcoming = match?.status === "scheduled"
  const latestPrediction = match?.predictions?.[0] ?? null

  // 赔率市场统计
  const oddsStats = useMemo(() => {
    if (!match || !match.odds || match.odds.length === 0) return null
    const major = match.odds.find((o) => o.isMajorBookmaker && !o.isAbnormal) || match.odds[0]
    const homeDir = match.odds.filter((o) => (o.homeChange ?? 0) < 0).length
    const awayDir = match.odds.filter((o) => (o.awayChange ?? 0) < 0).length
    const drawDir = match.odds.filter((o) => (o.drawChange ?? 0) < 0).length
    const abnormals = match.odds.filter((o) => o.isAbnormal).length
    return { major, homeDir, awayDir, drawDir, total: match.odds.length, abnormals }
  }, [match])

  const handleManualPredict = async () => {
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

  if (loading) return <p className="text-sm text-muted-foreground">加载中...</p>
  if (!match) return <p className="text-sm text-muted-foreground">比赛未找到</p>

  return (
    <div className="space-y-6">
      <Link href="/matches" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        返回比赛列表
      </Link>

      {/* ========== Card 1: 比赛信息头 ========== */}
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
              {match.homeTeam.baseScore != null && (
                <span className="mt-0.5 text-xs text-muted-foreground">
                  综合基础分: {match.homeTeam.baseScore}
                </span>
              )}
            </div>
            <div className="flex flex-col items-center gap-1">
              {match.status === "completed" && match.actualHomeScore != null ? (
                <span className="text-3xl font-extrabold tabular-nums">
                  {match.actualHomeScore} : {match.actualAwayScore}
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
              {match.awayTeam.baseScore != null && (
                <span className="mt-0.5 text-xs text-muted-foreground">
                  综合基础分: {match.awayTeam.baseScore}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========== 四维分析标签页 ========== */}
      <Tabs defaultValue={isUpcoming ? "overview" : "tools"}>
        <TabsList className="grid w-full grid-cols-4">
          {isUpcoming && (
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <Target className="h-3.5 w-3.5" />
              预测总览
            </TabsTrigger>
          )}
          <TabsTrigger value="odds" className="flex items-center gap-1">
            <BarChart3 className="h-3.5 w-3.5" />
            赔率分析
          </TabsTrigger>
          <TabsTrigger value="compare" className="flex items-center gap-1">
            <Scale className="h-3.5 w-3.5" />
            数据对比
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-1">
            {match.status === "completed" ? (
              <><ClipboardCheck className="h-3.5 w-3.5" />复盘总结</>
            ) : (
              <><DollarSign className="h-3.5 w-3.5" />复盘工具</>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ===== Tab 1: 预测总览 ===== */}
        {isUpcoming && (
          <TabsContent value="overview" className="space-y-4">
            {!latestPrediction && !clientPrediction ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-12">
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">点击按钮生成预测分析</p>
                  <Button onClick={handleManualPredict} disabled={predicting}>
                    {predicting ? "预测中..." : "生成预测"}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* 预测结果卡 */}
                <Card className="border-amber-200 dark:border-amber-800/30">
                  <CardHeader className="border-b border-amber-100 dark:border-amber-900/20">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Target className="h-4 w-4 text-amber-500" />
                      预测结果
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-5">
                    {/* 胜平负概率 */}
                    <div>
                      <div className="mb-2 text-sm text-muted-foreground">胜平负概率</div>
                      <div className="flex h-8 w-full overflow-hidden rounded-lg">
                        <div
                          className="flex items-center justify-center bg-green-500 text-xs font-bold text-white transition-all"
                          style={{ width: `${latestPrediction ? latestPrediction.homeWinProbability : clientPrediction?.homeWinProb ?? 33}%` }}
                        >
                          {((latestPrediction ? latestPrediction.homeWinProbability : clientPrediction?.homeWinProb ?? 0)) > 8
                            ? `${latestPrediction ? latestPrediction.homeWinProbability : clientPrediction?.homeWinProb ?? 0}%`
                            : ""}
                        </div>
                        <div
                          className="flex items-center justify-center bg-yellow-400 text-xs font-bold text-white transition-all"
                          style={{ width: `${latestPrediction ? latestPrediction.drawProbability : clientPrediction?.drawProb ?? 33}%` }}
                        >
                          {((latestPrediction ? latestPrediction.drawProbability : clientPrediction?.drawProb ?? 0)) > 8
                            ? `${latestPrediction ? latestPrediction.drawProbability : clientPrediction?.drawProb ?? 0}%`
                            : ""}
                        </div>
                        <div
                          className="flex items-center justify-center bg-blue-500 text-xs font-bold text-white transition-all"
                          style={{ width: `${latestPrediction ? latestPrediction.awayWinProbability : clientPrediction?.awayWinProb ?? 33}%` }}
                        >
                          {((latestPrediction ? latestPrediction.awayWinProbability : clientPrediction?.awayWinProb ?? 0)) > 8
                            ? `${latestPrediction ? latestPrediction.awayWinProbability : clientPrediction?.awayWinProb ?? 0}%`
                            : ""}
                        </div>
                      </div>
                      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                        <span className="text-green-600 font-medium">{match.homeTeam.name} 胜</span>
                        <span className="text-yellow-600 font-medium">平局</span>
                        <span className="text-blue-600 font-medium">{match.awayTeam.name} 胜</span>
                      </div>
                    </div>

                    {/* 方向 + 置信度 */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div className="rounded-lg border p-3 text-center">
                        <div className="text-xs text-muted-foreground">预测方向</div>
                        <div className="mt-1 text-sm font-semibold">
                          {latestPrediction
                            ? (latestPrediction.mainDirection === "home_win" ? `${match.homeTeam.name} 胜` :
                               latestPrediction.mainDirection === "away_win" ? `${match.awayTeam.name} 胜` :
                               latestPrediction.mainDirection === "draw" ? "平局" : "方向待定")
                            : clientPrediction?.mainDirection ?? "-"}
                        </div>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <div className="text-xs text-muted-foreground">置信度</div>
                        <div className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          confidenceColor(latestPrediction?.confidence ?? clientPrediction?.confidence ?? "low")
                        }`}>
                          {confidenceLabel[latestPrediction?.confidence ?? clientPrediction?.confidence ?? "low"] ?? "-"}
                        </div>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <div className="text-xs text-muted-foreground">风险等级</div>
                        <div className="mt-1 flex justify-center">
                          <RiskBadge level={latestPrediction?.riskLevel ?? null} />
                        </div>
                      </div>
                      {clientPrediction && (
                        <div className="rounded-lg border p-3 text-center">
                          <div className="text-xs text-muted-foreground">冷门指数</div>
                          <div className="mt-1 text-sm font-semibold">
                            {clientPrediction.upsetIndex === "low" ? "低" : clientPrediction.upsetIndex === "medium" ? "中" : "高"}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 模型置信度 */}
                    {modelPrediction && (
                      <div className="rounded-lg bg-violet-50 p-3 dark:bg-violet-950/20">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-violet-700 dark:text-violet-400 font-medium">
                            <BrainCircuit className="mr-1 inline h-4 w-4" />
                            泊松模型置信度
                          </span>
                          <span className="font-mono font-bold text-violet-700 dark:text-violet-400">
                            Top3 集中度 {modelPrediction.modelConfidence}%
                          </span>
                        </div>
                        {/* 预测比分迷你列表 */}
                        {modelPrediction.predictions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {modelPrediction.predictions.slice(0, 5).map((p) => (
                              <span key={p.score} className="rounded-md border bg-white px-2 py-1 text-xs font-mono dark:bg-violet-950/10">
                                {p.score}
                                <span className="ml-1 text-muted-foreground">{p.fusedProb.toFixed(1)}%</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 摘要 */}
                    {latestPrediction?.reportText && (
                      <div className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
                        {latestPrediction.reportText}
                      </div>
                    )}
                    {!latestPrediction && clientPrediction && (
                      <div className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
                        {clientPrediction.summary}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 风险提示卡 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ShieldAlert className="h-4 w-4 text-orange-500" />
                      风险提示
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {latestPrediction ? (
                      <ul className="space-y-1.5">
                        {parseRiskReasons(latestPrediction.riskReasons).map((reason, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
                            <span className="text-muted-foreground">{reason}</span>
                          </li>
                        ))}
                        {parseRiskReasons(latestPrediction.riskReasons).length === 0 && (
                          <li className="text-sm text-muted-foreground">暂无明显的风险提示</li>
                        )}
                      </ul>
                    ) : clientPrediction ? (
                      <ul className="space-y-1.5">
                        {clientPrediction.riskPoints.map((point, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
                            <span className="text-muted-foreground">{point}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">暂无数据</p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        )}

        {/* ===== Tab 2: 赔率分析 ===== */}
        <TabsContent value="odds" className="space-y-4">
          {/* 赔率市场卡 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                赔率市场分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!oddsStats ? (
                <p className="text-sm text-muted-foreground">暂无赔率数据</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-lg border p-3 text-center">
                      <div className="text-xs text-muted-foreground">市场方向</div>
                      <div className="mt-1 text-sm font-semibold">
                        {latestPrediction?.mainDirection === "home_win" ? "倾向主队" :
                         latestPrediction?.mainDirection === "away_win" ? "倾向客队" :
                         latestPrediction?.mainDirection === "draw" ? "平局" : "待定"}
                      </div>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <div className="text-xs text-muted-foreground">评分</div>
                      <div className="mt-1 text-sm font-semibold">
                        {latestPrediction?.marketScore != null ? `${latestPrediction.marketScore}/100` : "-"}
                      </div>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <div className="text-xs text-muted-foreground">一致性</div>
                      <div className="mt-1 text-sm font-semibold">
                        {oddsStats.abnormals === 0 ? "较高" : oddsStats.abnormals <= 1 ? "中等" : "较低"}
                      </div>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <div className="text-xs text-muted-foreground">异常赔率</div>
                      <div className={`mt-1 text-sm font-semibold ${oddsStats.abnormals > 0 ? "text-orange-600" : "text-green-600"}`}>
                        {oddsStats.abnormals > 0 ? `${oddsStats.abnormals} 家` : "无"}
                      </div>
                    </div>
                  </div>

                  {oddsStats.major && (
                    <div className="rounded-lg bg-muted/30 p-3">
                      <div className="mb-1 text-xs text-muted-foreground font-medium">{oddsStats.major.bookmaker} 赔率</div>
                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs">主胜 </span>
                          <span className="font-mono font-bold tabular-nums">{oddsStats.major.currentHomeWin.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">平局 </span>
                          <span className="font-mono font-bold tabular-nums">{oddsStats.major.currentDraw.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">客胜 </span>
                          <span className="font-mono font-bold tabular-nums">{oddsStats.major.currentAwayWin.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 价值信号卡 */}
          {latestPrediction && (latestPrediction.homeValueEv != null || latestPrediction.drawValueEv != null || latestPrediction.awayValueEv != null) && (
            <Card className="border-emerald-200 dark:border-emerald-800/30">
              <CardHeader className="border-b border-emerald-100 dark:border-emerald-900/20">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BrainCircuit className="h-4 w-4 text-emerald-500" />
                  赔率价值信号
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-3 font-medium">选项</th>
                        <th className="pb-2 pr-3 font-medium">模型概率</th>
                        <th className="pb-2 pr-3 font-medium">市场赔率</th>
                        <th className="pb-2 pr-3 font-medium">隐含概率</th>
                        <th className="pb-2 pr-3 font-medium">价值差</th>
                        <th className="pb-2 pr-3 font-medium">EV</th>
                        <th className="pb-2 font-medium">价值信号</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "主胜", ev: latestPrediction.homeValueEv, signal: latestPrediction.homeValueSignal, prob: latestPrediction.homeWinProbability, odds: oddsStats?.major?.currentHomeWin ?? 0 },
                        { label: "平局", ev: latestPrediction.drawValueEv, signal: latestPrediction.drawValueSignal, prob: latestPrediction.drawProbability, odds: oddsStats?.major?.currentDraw ?? 0 },
                        { label: "客胜", ev: latestPrediction.awayValueEv, signal: latestPrediction.awayValueSignal, prob: latestPrediction.awayWinProbability, odds: oddsStats?.major?.currentAwayWin ?? 0 },
                      ].map((row) => (
                        <tr key={row.label} className="border-b last:border-0">
                          <td className="py-2.5 pr-3 font-medium">{row.label}</td>
                          <td className="py-2.5 pr-3 font-mono tabular-nums">{(row.prob / 100).toFixed(1)}%</td>
                          <td className="py-2.5 pr-3 font-mono tabular-nums">{row.odds > 0 ? row.odds.toFixed(2) : "-"}</td>
                          <td className="py-2.5 pr-3 font-mono tabular-nums">{row.odds > 0 ? `${(1 / row.odds * 100).toFixed(1)}%` : "-"}</td>
                          <td className={`py-2.5 pr-3 font-mono tabular-nums ${
                            row.signal === "positive" ? "text-green-600" : row.signal === "negative" ? "text-red-600" : ""
                          }`}>
                            {row.ev != null ? `${(row.ev * 100).toFixed(1)}%` : "-"}
                          </td>
                          <td className={`py-2.5 pr-3 font-mono tabular-nums font-semibold ${
                            row.signal === "positive" ? "text-green-600" : row.signal === "negative" ? "text-red-600" : ""
                          }`}>
                            {row.ev != null ? row.ev.toFixed(3) : "-"}
                          </td>
                          <td className="py-2.5">
                            <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${getValueSignalColor(row.signal)}`}>
                              {getValueSignalLabel(row.signal)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 rounded-lg bg-muted/30 p-2.5 text-xs text-muted-foreground leading-relaxed">
                  <strong>说明：</strong>价值信号 = 模型概率 vs 市场隐含概率(1/赔率)的偏差。
                  EV &gt; 0.05 为正价值信号, EV &lt; -0.05 为负价值信号。
                </div>
              </CardContent>
            </Card>
          )}

          {/* 准确比分预测 */}
          {!csLoading && (
            <Card className="border-violet-200 dark:border-violet-800/30">
              <CardHeader className="border-b border-violet-100 dark:border-violet-900/20">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Goal className="h-4 w-4 text-violet-500" />
                  准确比分预测
                  {modelPrediction && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      Top3 集中度 {modelPrediction.modelConfidence}%
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-6">
                {modelPrediction && modelPrediction.predictions.length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-medium text-violet-700 dark:text-violet-400">
                      <BrainCircuit className="mr-1 inline h-4 w-4" />
                      模型预测概率
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="pb-2 pr-3 font-medium">比分</th>
                            <th className="pb-2 pr-3 font-medium">模型概率</th>
                            <th className="pb-2 pr-3 font-medium">市场概率</th>
                            <th className="pb-2 pr-3 font-medium">融合概率</th>
                            <th className="pb-2 font-medium">信号</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modelPrediction.predictions.slice(0, 10).map((p) => {
                            const maxProb = modelPrediction.predictions[0].fusedProb || 1
                            return (
                              <tr key={p.score} className="border-b last:border-0 hover:bg-muted/30">
                                <td className="py-2.5 pr-3">
                                  <span className="font-mono font-bold tabular-nums">{p.score}</span>
                                </td>
                                <td className="py-2.5 pr-3">
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                                      <div className="h-full rounded-full bg-indigo-400 transition-all" style={{ width: `${(p.modelProb / maxProb) * 100}%` }} />
                                    </div>
                                    <span className="font-mono text-xs tabular-nums">{p.modelProb.toFixed(1)}%</span>
                                  </div>
                                </td>
                                <td className="py-2.5 pr-3">
                                  {p.marketProb !== null ? (
                                    <div className="flex items-center gap-2">
                                      <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                                        <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${(p.marketProb / maxProb) * 100}%` }} />
                                      </div>
                                      <span className="font-mono text-xs tabular-nums">{p.marketProb.toFixed(1)}%</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 pr-3">
                                  <div className="flex items-center gap-2">
                                    <div className="h-2.5 w-16 overflow-hidden rounded-full bg-muted">
                                      <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${(p.fusedProb / maxProb) * 100}%` }} />
                                    </div>
                                    <span className="font-mono text-xs font-medium tabular-nums">{p.fusedProb.toFixed(1)}%</span>
                                  </div>
                                </td>
                                <td className="py-2.5">
                                  {p.valueSignal === "positive" && (
                                    <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">高价值</span>
                                  )}
                                  {p.valueSignal === "negative" && (
                                    <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">低价值</span>
                                  )}
                                  {p.valueSignal === "neutral" && (
                                    <span className="text-[10px] text-muted-foreground">中性</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {csItems.length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-medium text-amber-700 dark:text-amber-400">
                      <DollarSign className="mr-1 inline h-4 w-4" />
                      市场赔率参考
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="pb-2 pr-4 font-medium">比分</th>
                            <th className="pb-2 pr-4 font-medium">赔率</th>
                            <th className="pb-2 font-medium">隐含概率</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csItems.map((item) => (
                            <tr key={item.score} className="border-b last:border-0 hover:bg-muted/30">
                              <td className="py-2 pr-4">
                                <span className="font-mono font-bold tabular-nums">{item.score}</span>
                                <span className={`ml-2 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                  item.category === "最可能" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : item.category === "中等可能" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                                }`}>{item.category}</span>
                              </td>
                              <td className="py-2 pr-4 font-mono tabular-nums">{item.odds.toFixed(2)}</td>
                              <td className="py-2 font-mono tabular-nums">{item.impliedProb.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 全部赔率明细 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">全部赔率数据</CardTitle>
            </CardHeader>
            <CardContent>
              {!match.odds || match.odds.length === 0 ? (
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
                      {(match.odds ?? []).map((o) => (
                        <tr key={o.id} className="border-b last:border-0">
                          <td className="py-2 pr-4">
                            <span className="font-medium">{o.bookmaker}</span>
                            {o.isMajorBookmaker && <Badge variant="secondary" className="ml-1 text-[10px]">主流</Badge>}
                          </td>
                          <td className={`py-2 pr-4 font-mono tabular-nums ${o.isAbnormal ? "text-red-600 font-bold" : ""}`}>{o.currentHomeWin.toFixed(2)}</td>
                          <td className="py-2 pr-4 font-mono tabular-nums">{o.currentDraw.toFixed(2)}</td>
                          <td className="py-2 pr-4 font-mono tabular-nums">{o.currentAwayWin.toFixed(2)}</td>
                          <td className={`py-2 pr-4 font-mono tabular-nums ${(o.homeChange ?? 0) > 0 ? "text-green-600" : (o.homeChange ?? 0) < 0 ? "text-red-600" : ""}`}>
                            {(o.homeChange ?? 0) > 0 ? "+" : ""}{(o.homeChange ?? 0).toFixed(2)}
                          </td>
                          <td className={`py-2 pr-4 font-mono tabular-nums ${(o.drawChange ?? 0) > 0 ? "text-green-600" : (o.drawChange ?? 0) < 0 ? "text-red-600" : ""}`}>
                            {(o.drawChange ?? 0) > 0 ? "+" : ""}{(o.drawChange ?? 0).toFixed(2)}
                          </td>
                          <td className={`py-2 font-mono tabular-nums ${(o.awayChange ?? 0) > 0 ? "text-green-600" : (o.awayChange ?? 0) < 0 ? "text-red-600" : ""}`}>
                            {(o.awayChange ?? 0) > 0 ? "+" : ""}{(o.awayChange ?? 0).toFixed(2)}
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

        {/* ===== Tab 3: 数据对比 ===== */}
        <TabsContent value="compare" className="space-y-4">
          {/* 球队对比卡 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Scale className="h-4 w-4" />
                球队实力对比
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {latestPrediction && (
                <div>
                  <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                    <span>{match.homeTeam.name}</span>
                    <span className="font-semibold">
                      {latestPrediction.homeBaseScore ?? "?"} : {latestPrediction.awayBaseScore ?? "?"}
                    </span>
                    <span>{match.awayTeam.name}</span>
                  </div>
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div className="bg-amber-500 transition-all" style={{
                      width: latestPrediction.homeBaseScore != null && latestPrediction.awayBaseScore != null
                        ? `${(latestPrediction.homeBaseScore / (latestPrediction.homeBaseScore + latestPrediction.awayBaseScore)) * 100}%` : "50%"
                    }} />
                    <div className="bg-blue-500 transition-all" style={{
                      width: latestPrediction.homeBaseScore != null && latestPrediction.awayBaseScore != null
                        ? `${(latestPrediction.awayBaseScore / (latestPrediction.homeBaseScore + latestPrediction.awayBaseScore)) * 100}%` : "50%"
                    }} />
                  </div>
                </div>
              )}
              {clientPrediction && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="px-4 py-3 font-medium">因素</th>
                        <th className="px-4 py-3 font-medium text-right">{match.homeTeam.name}</th>
                        <th className="px-4 py-3 font-medium text-center" />
                        <th className="px-4 py-3 font-medium text-left">{match.awayTeam.name}</th>
                        <th className="px-4 py-3 font-medium text-left hidden sm:table-cell">倾向</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientPrediction.factors.map((f) => (
                        <tr key={f.label} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{f.label}</td>
                          <td className={`px-4 py-3 text-right font-mono tabular-nums ${f.advantage === "home" ? "font-semibold text-amber-700 dark:text-amber-400" : ""}`}>{f.homeValue}</td>
                          <td className="px-4 py-3 text-center">
                            {f.advantage === "home" ? (
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">H</span>
                            ) : f.advantage === "away" ? (
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">A</span>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">=</span>
                            )}
                          </td>
                          <td className={`px-4 py-3 font-mono tabular-nums ${f.advantage === "away" ? "font-semibold text-blue-700 dark:text-blue-400" : ""}`}>{f.awayValue}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{f.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!clientPrediction && (
                <p className="text-sm text-muted-foreground">球队详细数据加载中...</p>
              )}
            </CardContent>
          </Card>

          {/* 交锋分析卡 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" />
                历史交锋分析
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {h2hLoading ? (
                <p className="text-sm text-muted-foreground">加载交锋数据...</p>
              ) : h2hAnalysis ? (
                <>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/20">
                      <div className="text-xs text-muted-foreground">{match.homeTeam.name} 胜</div>
                      <div className="mt-0.5 text-xl font-bold text-amber-700 dark:text-amber-400">{h2hAnalysis.homeWins}</div>
                      <div className="text-xs text-muted-foreground">{h2hAnalysis.homeWinRate}%</div>
                    </div>
                    <div className="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-950/20">
                      <div className="text-xs text-muted-foreground">平局</div>
                      <div className="mt-0.5 text-xl font-bold text-yellow-700 dark:text-yellow-400">{h2hAnalysis.draws}</div>
                      <div className="text-xs text-muted-foreground">{h2hAnalysis.drawRate}%</div>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
                      <div className="text-xs text-muted-foreground">{match.awayTeam.name} 胜</div>
                      <div className="mt-0.5 text-xl font-bold text-blue-700 dark:text-blue-400">{h2hAnalysis.awayWins}</div>
                      <div className="text-xs text-muted-foreground">{h2hAnalysis.awayWinRate}%</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border p-2.5 text-center">
                      <div className="text-[10px] text-muted-foreground">总交锋</div>
                      <div className="mt-0.5 text-base font-bold">{h2hAnalysis.totalMatches} 场</div>
                    </div>
                    <div className="rounded-lg border p-2.5 text-center">
                      <div className="text-[10px] text-muted-foreground">场均总进球</div>
                      <div className="mt-0.5 text-base font-bold">{h2hAnalysis.avgTotalGoals}</div>
                    </div>
                    <div className="rounded-lg border p-2.5 text-center">
                      <div className="text-[10px] text-muted-foreground">双方进球率</div>
                      <div className="mt-0.5 text-base font-bold">{h2hAnalysis.bothTeamsScoredRate}%</div>
                    </div>
                    <div className="rounded-lg border p-2.5 text-center">
                      <div className="text-[10px] text-muted-foreground">样本</div>
                      <div className="mt-0.5 text-base font-bold">{h2hAnalysis.recentForm}</div>
                    </div>
                  </div>
                  {h2hAnalysis.commonScores.length > 0 && (
                    <div>
                      <div className="mb-2 text-xs font-medium text-muted-foreground">常见比分</div>
                      <div className="flex flex-wrap gap-2">
                        {h2hAnalysis.commonScores.map((s) => (
                          <div key={s.score} className="rounded-md border bg-muted/30 px-2.5 py-1.5 text-center text-sm">
                            <span className="font-mono font-bold tabular-nums">{s.score}</span>
                            <span className="ml-1.5 text-xs text-muted-foreground">{s.count}次 ({s.percentage}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6">
                  <History className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">暂无历史交锋数据</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 交锋记录表 */}
          <HeadToHeadCard matchId={match.id} homeTeam={match.homeTeam} awayTeam={match.awayTeam} />
        </TabsContent>

        {/* ===== Tab 4: 复盘工具/总结 ===== */}
        <TabsContent value="tools" className="space-y-4">
          {isUpcoming && (
            <VirtualSimulation matchId={match.id} prediction={latestPrediction} />
          )}
          {match.status === "completed" ? (
            <ReviewDetailCard matchId={match.id} status={match.status} />
          ) : (
            <ReviewDetailCard matchId={match.id} status={match.status} />
          )}
        </TabsContent>
      </Tabs>

      {/* 无预测时显示生成按钮 */}
      {isUpcoming && !latestPrediction && !clientPrediction && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">点击按钮生成预测分析</p>
            <Button onClick={handleManualPredict} disabled={predicting}>
              {predicting ? "预测中..." : "生成预测"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Card 10: 赛后比分录入（未结束的比赛） */}
      {match.status !== "completed" && (
        <ScoreEntryCard matchId={match.id} onResultSubmitted={() => {
          fetch(`/api/matches/${params.id}`).then(r => r.json()).then(res => setMatch(res.data ?? null))
        }} />
      )}

      {/* Card 11: 回顾成绩卡（已结束比赛） */}
      {match.status === "completed" && (
        <ReviewEntryCard matchId={match.id} />
      )}

      {/* ========== 底部标签页 ========== */}
      <Tabs defaultValue="odds">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="odds" className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5" />
            赔率明细
          </TabsTrigger>
          <TabsTrigger value="h2h" className="flex items-center gap-1">
            <History className="h-3.5 w-3.5" />
            交锋记录
          </TabsTrigger>
          <TabsTrigger value="review" className="flex items-center gap-1">
            <ClipboardCheck className="h-3.5 w-3.5" />
            复盘详情
          </TabsTrigger>
        </TabsList>

        <TabsContent value="odds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">全部赔率数据</CardTitle>
            </CardHeader>
            <CardContent>
              {!match.odds || match.odds.length === 0 ? (
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
                      {(match.odds ?? []).map((o) => (
                        <tr key={o.id} className="border-b last:border-0">
                          <td className="py-2 pr-4">
                            <span className="font-medium">{o.bookmaker}</span>
                            {o.isMajorBookmaker && (
                              <Badge variant="secondary" className="ml-1 text-[10px]">主流</Badge>
                            )}
                          </td>
                          <td className={`py-2 pr-4 font-mono tabular-nums ${o.isAbnormal ? "text-red-600 font-bold" : ""}`}>
                            {o.currentHomeWin.toFixed(2)}
                          </td>
                          <td className="py-2 pr-4 font-mono tabular-nums">{o.currentDraw.toFixed(2)}</td>
                          <td className="py-2 pr-4 font-mono tabular-nums">{o.currentAwayWin.toFixed(2)}</td>
                          <td className={`py-2 pr-4 font-mono tabular-nums ${(o.homeChange ?? 0) > 0 ? "text-green-600" : (o.homeChange ?? 0) < 0 ? "text-red-600" : ""}`}>
                            {(o.homeChange ?? 0) > 0 ? "+" : ""}{(o.homeChange ?? 0).toFixed(2)}
                          </td>
                          <td className={`py-2 pr-4 font-mono tabular-nums ${(o.drawChange ?? 0) > 0 ? "text-green-600" : (o.drawChange ?? 0) < 0 ? "text-red-600" : ""}`}>
                            {(o.drawChange ?? 0) > 0 ? "+" : ""}{(o.drawChange ?? 0).toFixed(2)}
                          </td>
                          <td className={`py-2 font-mono tabular-nums ${(o.awayChange ?? 0) > 0 ? "text-green-600" : (o.awayChange ?? 0) < 0 ? "text-red-600" : ""}`}>
                            {(o.awayChange ?? 0) > 0 ? "+" : ""}{(o.awayChange ?? 0).toFixed(2)}
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

        <TabsContent value="h2h" className="space-y-4">
          <HeadToHeadCard matchId={match.id} homeTeam={match.homeTeam} awayTeam={match.awayTeam} />
        </TabsContent>

        <TabsContent value="review" className="space-y-4">
          <ReviewDetailCard matchId={match.id} status={match.status} />
        </TabsContent>
      </Tabs>

      {/* 免责声明 */}
      <div className="rounded-lg bg-muted/30 p-3 text-center text-xs text-muted-foreground leading-relaxed">
        本页面提供的数据分析、赔率市场信号、价值信号和虚拟模拟仅供足球数据分析参考，
        用于赛后复盘和学习研究，不构成任何形式的投注建议。
      </div>
    </div>
  )
}

/* ==================== 子组件 ==================== */

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
      .then((res) => {
        const data = res.data as H2HApiResponse | undefined
        setRecords(data?.records ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [matchId])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">加载中...</CardContent>
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
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">日期</th>
                <th className="px-4 py-3 font-medium">赛事</th>
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
                  <tr key={r.id} className={`border-b last:border-0 hover:bg-muted/30 ${isSamePairing ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}`}>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {new Date(r.matchDate).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.competition ?? "-"}</td>
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
      <div className="border-t px-4 py-2 text-center text-xs text-muted-foreground">
        {homeTeam.name} {homeWins}胜 {draws}平 {awayWins}负 {awayTeam.name}
        {records.some((r) => r.homeTeamName === homeTeam.name && r.awayTeamName === awayTeam.name) && (
          <span className="ml-2 text-amber-600">（含相同对阵高亮记录）</span>
        )}
      </div>
    </Card>
  )
}

function VirtualSimulation({
  matchId,
  prediction,
}: {
  matchId: string
  prediction: ServerPrediction | null
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
      if (data.success) setResult(data.data)
    } catch {
      // ignore
    } finally {
      setSimulating(false)
    }
  }

  const riskColor = (level: string) => {
    const map: Record<string, string> = {
      low: "text-green-600", medium_low: "text-lime-600", medium: "text-yellow-600",
      medium_high: "text-orange-600", high: "text-red-600", extreme: "text-red-700 font-bold",
    }
    return map[level] ?? ""
  }
  const riskLabel = (level: string) => {
    const map: Record<string, string> = {
      low: "低风险", medium_low: "中低风险", medium: "中等风险",
      medium_high: "中高风险", high: "高风险", extreme: "极高风险",
    }
    return map[level] ?? level
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-4 w-4" />
          虚拟投注模拟
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!prediction ? (
          <p className="text-sm text-muted-foreground">请先生成预测</p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground whitespace-nowrap">虚拟本金</label>
              <input
                type="number"
                value={bankroll}
                onChange={(e) => setBankroll(e.target.value)}
                className="flex h-9 w-32 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              />
              <Button onClick={handleSimulate} disabled={simulating} size="sm">
                {simulating ? "计算中..." : "模拟"}
              </Button>
            </div>
            {result && (
              <div className="rounded-lg border p-4">
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <div className="text-muted-foreground">建议金额</div>
                    <div className="mt-1 text-lg font-bold">
                      ${result.recommendedStake.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">({result.stakePercent}% 本金)</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">预期回报</div>
                    <div className="mt-1 text-lg font-bold">${result.expectedReturn.toFixed(2)}</div>
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
            <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 leading-relaxed">
              <strong>说明：</strong>本模拟基于凯利公式计算，仅供虚拟学习和数据分析参考，
              不构成任何投注建议。足球比赛具有不确定性，请理性决策。
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function ReviewEntryCard({ matchId }: { matchId: string }) {
  const [review, setReview] = useState<{
    id: string
    predictionHit: boolean | null
    actualResult: string | null
    predictedResult: string | null
    probabilityError: number | null
    reviewSummary: string | null
    createdAt: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/matches/${matchId}/review`)
      .then((r) => r.json())
      .then((res) => setReview(res.data ?? null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [matchId])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-4 w-4" />
          赛后复盘
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">加载中...</p>
        ) : review ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">预测方向</div>
                <div className="mt-1 text-sm font-semibold">
                  {review.predictedResult === "home_win" ? "主胜" :
                   review.predictedResult === "away_win" ? "客胜" : "平局"}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">实际结果</div>
                <div className="mt-1 text-sm font-semibold">
                  {review.actualResult === "home_win" ? "主胜" :
                   review.actualResult === "away_win" ? "客胜" : "平局"}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">命中</div>
                <div className={`mt-1 text-sm font-semibold ${review.predictionHit ? "text-green-600" : "text-red-600"}`}>
                  {review.predictionHit ? "是" : "否"}
                </div>
              </div>
            </div>
            {review.reviewSummary && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm leading-relaxed">
                {review.reviewSummary}
              </div>
            )}
            <div className="text-xs text-muted-foreground text-right">
              复盘时间: {new Date(review.createdAt).toLocaleString("zh-CN")}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8">
            <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">暂无复盘数据</p>
            <Button onClick={() => window.location.href = `/matches/${matchId}/review`} size="sm" variant="outline">
              创建复盘
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ScoreEntryCard({ matchId, onResultSubmitted }: { matchId: string; onResultSubmitted: () => void }) {
  const [homeScore, setHomeScore] = useState("")
  const [awayScore, setAwayScore] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    const h = parseInt(homeScore)
    const a = parseInt(awayScore)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      setError("请输入有效的比分")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch(`/api/matches/${matchId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actualHomeScore: h, actualAwayScore: a }),
      })
      const data = await res.json()
      if (data.success) {
        onResultSubmitted()
      } else {
        setError(data.error ?? "提交失败")
      }
    } catch {
      setError("网络错误")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="border-emerald-200 dark:border-emerald-800/30">
      <CardHeader className="border-b border-emerald-100 dark:border-emerald-900/20">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-4 w-4 text-emerald-500" />
          赛后比分录入
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground text-center">
            比赛已结束？录入实际比分后系统将自动标记为完成并生成复盘分析。
          </p>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <label className="text-xs text-muted-foreground">主队</label>
              <input
                type="number"
                min="0"
                max="20"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                className="flex h-12 w-16 rounded-md border border-input bg-transparent text-center text-lg font-bold tabular-nums shadow-sm"
                placeholder="0"
              />
            </div>
            <span className="text-xl font-bold text-muted-foreground mt-6">:</span>
            <div className="flex flex-col items-center gap-1">
              <label className="text-xs text-muted-foreground">客队</label>
              <input
                type="number"
                min="0"
                max="20"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                className="flex h-12 w-16 rounded-md border border-input bg-transparent text-center text-lg font-bold tabular-nums shadow-sm"
                placeholder="0"
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "提交中..." : "提交比分并生成复盘"}
          </Button>
          <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 leading-relaxed">
            提交后比赛状态将更新为"已结束"，系统会根据预测与实际结果的偏差自动生成复盘报告。
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ReviewDetailCard({ matchId, status }: { matchId: string; status: string }) {
  const [review, setReview] = useState<{
    id: string
    predictionHit: boolean | null
    actualResult: string | null
    predictedResult: string | null
    probabilityError: number | null
    reviewSummary: string | null
    createdAt: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/matches/${matchId}/review`)
      .then((r) => r.json())
      .then((res) => setReview(res.data ?? null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [matchId])

  if (status !== "completed") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">比赛尚未结束，暂无复盘数据</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">加载中...</CardContent>
      </Card>
    )
  }

  if (!review) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">比赛已结束，暂无复盘数据</p>
          <Button onClick={() => window.location.href = `/matches/${matchId}/review`}>
            创建复盘
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">详细复盘</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border p-3 text-center">
            <div className="text-xs text-muted-foreground">预测方向</div>
            <div className="mt-1 text-sm font-semibold">
              {review.predictedResult === "home_win" ? "主胜" : review.predictedResult === "away_win" ? "客胜" : "平局"}
            </div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="text-xs text-muted-foreground">实际结果</div>
            <div className="mt-1 text-sm font-semibold">
              {review.actualResult === "home_win" ? "主胜" : review.actualResult === "away_win" ? "客胜" : "平局"}
            </div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="text-xs text-muted-foreground">概率误差</div>
            <div className="mt-1 text-sm font-semibold">
              {review.probabilityError != null ? `${(review.probabilityError * 100).toFixed(1)}%` : "-"}
            </div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="text-xs text-muted-foreground">命中</div>
            <div className={`mt-1 text-sm font-semibold ${review.predictionHit ? "text-green-600" : "text-red-600"}`}>
              {review.predictionHit ? "是" : "否"}
            </div>
          </div>
        </div>
        {review.reviewSummary && (
          <div className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
            {review.reviewSummary}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
