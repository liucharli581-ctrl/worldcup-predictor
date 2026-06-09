import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiSuccess, apiError } from "@/lib/api-response"
import { analyzeCorrectScores } from "@/lib/analysis"
import { predictCorrectScores, type FusionResult } from "@/lib/correct-score-predictor"
import { fetchCorrectScoreOdds, isOddsApiConfigured } from "@/lib/odds-api"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const match = await prisma.match.findUnique({
      where: { id },
      select: {
        homeTeamId: true,
        awayTeamId: true,
        homeTeam: {
          select: { name: true, avgGoalsFor: true, avgGoalsAgainst: true },
        },
        awayTeam: {
          select: { name: true, avgGoalsFor: true, avgGoalsAgainst: true },
        },
      },
    })

    if (!match) return apiError("比赛不存在", 404)

    // 并行获取数据
    const dbRecords = await prisma.correctScoreOdds.findMany({
      where: { matchId: id, isMajorBookmaker: true },
      orderBy: { odds: "asc" },
    })

    // 1. 数据库中的市场赔率
    const marketFromDb = dbRecords.map(r => ({ score: r.score, odds: r.odds }))
    const marketAnalysis = marketFromDb.length > 0
      ? analyzeCorrectScores(marketFromDb)
      : []

    // 2. 泊松模型预测
    const home = match.homeTeam
    const away = match.awayTeam
    const teamStatsHome = {
      name: home.name,
      avgGoalsFor: home.avgGoalsFor ?? 1.5,
      avgGoalsAgainst: home.avgGoalsAgainst ?? 1.5,
    }
    const teamStatsAway = {
      name: away.name,
      avgGoalsFor: away.avgGoalsFor ?? 1.5,
      avgGoalsAgainst: away.avgGoalsAgainst ?? 1.5,
    }

    // 3. The Odds API 市场数据（可选，需配置 key）
    let apiMarketOdds = null
    if (isOddsApiConfigured()) {
      apiMarketOdds = await fetchCorrectScoreOdds(id, home.name, away.name)
    }

    // 4. 融合预测
    const marketForFusion = apiMarketOdds
      ? apiMarketOdds.map(m => ({
          score: m.score,
          odds: m.odds,
          impliedProb: 1 / m.odds,
        }))
      : marketFromDb.map(m => ({
          score: m.score,
          odds: m.odds,
          impliedProb: 1 / m.odds,
        }))

    const fusionResult: FusionResult = predictCorrectScores(
      teamStatsHome,
      teamStatsAway,
      marketForFusion.length > 0 ? marketForFusion : null,
    )

    return apiSuccess({
      items: dbRecords,
      analysis: marketAnalysis,
      modelPrediction: {
        predictions: fusionResult.predictions,
        outcomeSummary: fusionResult.outcomeSummary,
        modelConfidence: fusionResult.modelConfidence,
      },
      sources: {
        hasMarketData: fusionResult.hasMarketData,
        hasModelData: true,
        apiSource: apiMarketOdds ? "the-odds-api" : null,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取准确比分赔率失败"
    return apiError(message, 500)
  }
}
