import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiSuccess, apiError } from "@/lib/api-response"
import {
  calculateTeamBaseScore,
  analyzeMarketDirection,
  calculateProbabilities,
  calculateRiskLevel,
  generateReport,
} from "@/lib/prediction"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        homeTeam: true,
        awayTeam: true,
        odds: true,
      },
    })

    if (!match) return apiError("比赛不存在", 404)

    const homeScore = calculateTeamBaseScore(match.homeTeam)
    const awayScore = calculateTeamBaseScore(match.awayTeam)
    const marketAnalysis = analyzeMarketDirection(match.odds)

    const probs = calculateProbabilities(
      homeScore.baseScore,
      awayScore.baseScore,
      marketAnalysis.marketScore,
      match.matchStage,
      match.homeTeam.name,
      match.awayTeam.name
    )

    const { riskLevel, riskReasons } = calculateRiskLevel({
      scoreDiff: Math.abs(homeScore.baseScore - awayScore.baseScore),
      bookmakerConsistency: marketAnalysis.bookmakerConsistency,
      abnormalCount: marketAnalysis.abnormalCount,
      injuryScoreHome: match.homeTeam.injuryScore ?? 0,
      injuryScoreAway: match.awayTeam.injuryScore ?? 0,
      drawProbability: probs.drawProbability,
      totalOddsRecords: match.odds.length,
    })

    const reportText = generateReport({
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeScore,
      awayScore,
      marketAnalysis,
      homeWinProbability: probs.homeWinProbability,
      drawProbability: probs.drawProbability,
      awayWinProbability: probs.awayWinProbability,
      mainDirection: probs.mainDirection,
      riskLevel,
      riskReasons,
    })

    const prediction = await prisma.prediction.create({
      data: {
        matchId: id,
        modelVersion: "v1.0",
        homeBaseScore: homeScore.baseScore,
        awayBaseScore: awayScore.baseScore,
        marketScore: marketAnalysis.marketScore,
        homeWinProbability: probs.homeWinProbability,
        drawProbability: probs.drawProbability,
        awayWinProbability: probs.awayWinProbability,
        mainDirection: probs.mainDirection,
        confidence: probs.confidence,
        riskLevel,
        riskReasons: JSON.stringify(riskReasons),
        reportText,
      },
    })

    return apiSuccess({
      ...prediction,
      riskReasons,
      marketAnalysis,
      homeTeamScore: homeScore,
      awayTeamScore: awayScore,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "预测计算失败"
    return apiError(message, 500)
  }
}
