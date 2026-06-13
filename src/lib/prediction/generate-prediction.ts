import type { Match, Team } from "@/generated/prisma/client"
import { calculateTeamBaseScore } from "./calculateTeamBaseScore"
import { calculateProbabilities } from "./calculateProbabilities"
import { calculateRiskLevel } from "./calculateRiskLevel"
import { analyzeMarketDirection } from "./analyzeMarketDirection"
import { generateReport } from "./generateReport"
import type { MarketAnalysis } from "./types"

export async function generatePrediction(
  match: Match & { homeTeam: Team; awayTeam: Team }
) {
  const homeScore = calculateTeamBaseScore(match.homeTeam)
  const awayScore = calculateTeamBaseScore(match.awayTeam)

  // 获取赔率数据用于市场分析
  const { prisma } = await import("@/lib/prisma")
  const oddsRecords = await prisma.oddsRecord.findMany({
    where: { matchId: match.id },
  })

  let marketAnalysis: MarketAnalysis = {
    total: 0, homeDown: 0, homeUp: 0, homeSame: 0,
    drawDown: 0, drawUp: 0, drawSame: 0,
    awayDown: 0, awayUp: 0, awaySame: 0,
    marketDirection: "unclear", bookmakerConsistency: "low",
    abnormalCount: 0, marketScore: 50,
    majorBookmakerDirection: "unclear",
  }

  if (oddsRecords.length > 0) {
    marketAnalysis = analyzeMarketDirection(
      oddsRecords.map((r) => ({
        ...r,
        homeChange: r.homeChange ?? 0,
        drawChange: r.drawChange ?? 0,
        awayChange: r.awayChange ?? 0,
        homeChangeRate: r.homeChangeRate ?? 0,
        drawChangeRate: r.drawChangeRate ?? 0,
        awayChangeRate: r.awayChangeRate ?? 0,
      }))
    )
  }

  const isGroupStage = match.matchStage?.startsWith("Group") ?? true
  const stageLabel = isGroupStage ? "group" : "knockout"

  const probs = calculateProbabilities(
    homeScore.baseScore,
    awayScore.baseScore,
    marketAnalysis.marketScore,
    stageLabel,
    match.homeTeam.name,
    match.awayTeam.name
  )

  const risk = calculateRiskLevel({
    scoreDiff: Math.abs(homeScore.baseScore - awayScore.baseScore),
    bookmakerConsistency: marketAnalysis.bookmakerConsistency,
    abnormalCount: marketAnalysis.abnormalCount,
    injuryScoreHome: match.homeTeam.injuryScore ?? 0,
    injuryScoreAway: match.awayTeam.injuryScore ?? 0,
    drawProbability: probs.drawProbability,
    totalOddsRecords: oddsRecords.length,
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
    riskLevel: risk.riskLevel,
    riskReasons: risk.riskReasons,
  })

  return {
    modelVersion: "v1",
    homeBaseScore: homeScore.baseScore,
    awayBaseScore: awayScore.baseScore,
    marketScore: marketAnalysis.marketScore,
    homeWinProbability: probs.homeWinProbability,
    drawProbability: probs.drawProbability,
    awayWinProbability: probs.awayWinProbability,
    mainDirection: probs.mainDirection,
    confidence: probs.confidence,
    riskLevel: risk.riskLevel,
    riskReasons: risk.riskReasons,
    reportText,
  }
}
