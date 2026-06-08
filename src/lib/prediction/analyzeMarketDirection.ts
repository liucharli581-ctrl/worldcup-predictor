import type { MarketAnalysis } from "./types"
import { isMajorBookmaker } from "./types"

interface OddsInput {
  id?: string
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
  homeChangeRate: number | null
  drawChangeRate: number | null
  awayChangeRate: number | null
  isMajorBookmaker: boolean
  isAbnormal: boolean
}

export function analyzeMarketDirection(
  oddsRecords: OddsInput[]
): MarketAnalysis {
  const total = oddsRecords.length

  const homeDown = oddsRecords.filter((r) => (r.homeChange ?? 0) < 0).length
  const homeUp = oddsRecords.filter((r) => (r.homeChange ?? 0) > 0).length
  const homeSame = total - homeDown - homeUp

  const drawDown = oddsRecords.filter((r) => (r.drawChange ?? 0) < 0).length
  const drawUp = oddsRecords.filter((r) => (r.drawChange ?? 0) > 0).length
  const drawSame = total - drawDown - drawUp

  const awayDown = oddsRecords.filter((r) => (r.awayChange ?? 0) < 0).length
  const awayUp = oddsRecords.filter((r) => (r.awayChange ?? 0) > 0).length
  const awaySame = total - awayDown - awayUp

  const abnormalCount = oddsRecords.filter((r) => r.isAbnormal).length

  const homeDownRatio = total > 0 ? homeDown / total : 0
  const homeUpRatio = total > 0 ? homeUp / total : 0

  let marketDirection = "unclear"
  let bookmakerConsistency = "low"

  if (homeDownRatio >= 0.7) {
    marketDirection = "home_win_strong"
    bookmakerConsistency = "high"
  } else if (homeDownRatio >= 0.5) {
    marketDirection = "home_win_medium"
    bookmakerConsistency = "medium_high"
  } else if (homeUpRatio >= 0.7) {
    marketDirection = "home_win_weakened"
    bookmakerConsistency = "high"
  } else if (homeUpRatio >= 0.5) {
    marketDirection = "home_win_weakened"
    bookmakerConsistency = "medium"
  } else if (awayDown / total >= 0.5) {
    marketDirection = "away_win_warming"
    bookmakerConsistency = "medium"
  } else if (drawDown / total >= 0.5) {
    marketDirection = "draw_warming"
    bookmakerConsistency = "medium"
  } else if (homeDownRatio > 0.3 && homeUpRatio > 0.3) {
    marketDirection = "divided"
    bookmakerConsistency = "low"
  }

  const majorRecords = oddsRecords.filter(
    (r) => r.isMajorBookmaker
  )
  const majorHomeDown = majorRecords.filter(
    (r) => (r.homeChange ?? 0) < 0
  ).length
  const majorHomeUp = majorRecords.filter(
    (r) => (r.homeChange ?? 0) > 0
  ).length

  let majorBookmakerDirection = "unclear"
  if (majorRecords.length > 0) {
    const majorDownRatio = majorHomeDown / majorRecords.length
    if (majorDownRatio >= 0.6) majorBookmakerDirection = "home_win"
    else if (majorHomeUp / majorRecords.length >= 0.6)
      majorBookmakerDirection = "home_win_weakened"
    else majorBookmakerDirection = "divided"
  }

  const consistencyScore =
    bookmakerConsistency === "high"
      ? 90
      : bookmakerConsistency === "medium_high"
        ? 70
        : bookmakerConsistency === "medium"
          ? 50
          : 20

  const directionScore =
    marketDirection === "home_win_strong"
      ? 80
      : marketDirection === "home_win_medium"
        ? 60
        : marketDirection === "home_win_weakened"
          ? 40
          : marketDirection === "away_win_warming"
            ? 30
            : marketDirection === "draw_warming"
              ? 30
              : 30

  const majorScore =
    majorBookmakerDirection === "home_win"
      ? 85
      : majorBookmakerDirection === "home_win_weakened"
        ? 35
        : 45

  const abnormalPenalty = Math.max(0, 100 - abnormalCount * 15)

  const marketScore = Math.round(
    consistencyScore * 0.3 +
      directionScore * 0.2 +
      majorScore * 0.2 +
      abnormalPenalty * 0.1 +
      50 * 0.2
  )

  return {
    total,
    homeDown,
    homeUp,
    homeSame,
    drawDown,
    drawUp,
    drawSame,
    awayDown,
    awayUp,
    awaySame,
    marketDirection,
    bookmakerConsistency,
    abnormalCount,
    marketScore,
    majorBookmakerDirection,
  }
}
