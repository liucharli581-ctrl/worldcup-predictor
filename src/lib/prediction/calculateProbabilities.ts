import type { PredictionResult, MarketAnalysis } from "./types"

export function calculateDrawProbability(
  homeScore: number,
  awayScore: number,
  matchStage: string | null
): number {
  const diff = Math.abs(homeScore - awayScore)

  let drawProbability: number
  if (diff < 5) drawProbability = 30
  else if (diff < 15) drawProbability = 25
  else if (diff < 30) drawProbability = 20
  else drawProbability = 15

  if (matchStage === "knockout") drawProbability += 3

  return Math.min(drawProbability, 35)
}

export function calculateProbabilities(
  homeScore: number,
  awayScore: number,
  marketScore: number,
  matchStage: string | null,
  homeTeamName: string,
  awayTeamName: string
): Omit<PredictionResult, "riskLevel" | "riskReasons" | "reportText" | "homeBaseScore" | "awayBaseScore" | "marketScore"> {
  const marketAdjustmentHome = marketScore > 60 ? 5 : marketScore > 40 ? 0 : -5
  const marketAdjustmentAway = marketScore > 60 ? -5 : marketScore > 40 ? 0 : 5

  const adjustedHomeScore = homeScore + marketAdjustmentHome
  const adjustedAwayScore = awayScore + marketAdjustmentAway

  const drawProbability = calculateDrawProbability(
    adjustedHomeScore,
    adjustedAwayScore,
    matchStage
  )

  const remaining = 100 - drawProbability
  const totalScore = adjustedHomeScore + adjustedAwayScore

  const homeWinProbability =
    totalScore > 0
      ? remaining * (adjustedHomeScore / totalScore)
      : remaining * 0.5
  const awayWinProbability =
    totalScore > 0
      ? remaining * (adjustedAwayScore / totalScore)
      : remaining * 0.5

  const homeRounded = Math.round(homeWinProbability)
  const awayRounded = Math.round(awayWinProbability)
  const drawRounded = Math.round(drawProbability)

  const sum = homeRounded + awayRounded + drawRounded
  const diff = 100 - sum

  const finalHome =
    homeRounded >= awayRounded ? homeRounded + diff : homeRounded
  const finalAway =
    awayRounded > homeRounded ? awayRounded + diff : awayRounded

  const mainDirection =
    finalHome > drawRounded && finalHome > finalAway
      ? "home_win"
      : finalAway > finalHome && finalAway > drawRounded
        ? "away_win"
        : "draw"

  const maxProb = Math.max(finalHome, drawRounded, finalAway)
  const confidence =
    maxProb >= 60 ? "high" : maxProb >= 50 ? "medium" : "low"

  return {
    homeWinProbability: finalHome,
    drawProbability: drawRounded,
    awayWinProbability: finalAway,
    mainDirection,
    confidence,
  }
}
