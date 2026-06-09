import { prisma } from "@/lib/prisma"
import { apiSuccess, apiError } from "@/lib/api-response"

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

export async function GET() {
  try {
    const reviews = await prisma.modelReview.findMany({
      include: {
        prediction: true,
      },
    })

    const totalReviews = reviews.length

    // Overall stats
    const hits = reviews.filter((r) => r.predictionHit === true).length
    const overallHitRate = totalReviews > 0 ? (hits / totalReviews) * 100 : 0

    // Average probability error
    const errors = reviews
      .map((r) => r.probabilityError)
      .filter((e): e is number => e !== null)
    const avgProbabilityError =
      errors.length > 0
        ? errors.reduce((a, b) => a + b, 0) / errors.length
        : 0

    // By risk level
    const riskLevelMap = new Map<string, { total: number; hits: number }>()
    for (const review of reviews) {
      const riskLevel = review.prediction?.riskLevel ?? "未分级"
      const entry = riskLevelMap.get(riskLevel) ?? { total: 0, hits: 0 }
      entry.total++
      if (review.predictionHit) entry.hits++
      riskLevelMap.set(riskLevel, entry)
    }
    const byRiskLevel: RiskLevelStat[] = Array.from(riskLevelMap.entries())
      .map(([riskLevel, { total, hits }]) => ({
        riskLevel,
        total,
        hits,
        hitRate: total > 0 ? Math.round((hits / total) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)

    // Calibration
    const calibrationMap = new Map<
      string,
      { total: number; hits: number; sumPredicted: number }
    >()
    for (const review of reviews) {
      const pred = review.prediction
      if (!pred || review.predictionHit === null) continue

      // Get predicted probability for the main direction
      let predictedProb: number | null = null
      if (pred.mainDirection === "home_win") {
        predictedProb = pred.homeWinProbability
      } else if (pred.mainDirection === "away_win") {
        predictedProb = pred.awayWinProbability
      } else if (pred.mainDirection === "draw") {
        predictedProb = pred.drawProbability
      }

      if (predictedProb === null || predictedProb === undefined) continue

      // Group into 10% probability brackets
      const bracketStart = Math.floor(predictedProb / 10) * 10
      const bracketEnd = Math.min(bracketStart + 10, 100)
      const bracketLabel = `${bracketStart}-${bracketEnd}%`

      const entry = calibrationMap.get(bracketLabel) ?? {
        total: 0,
        hits: 0,
        sumPredicted: 0,
      }
      entry.total++
      entry.sumPredicted += predictedProb
      if (review.predictionHit) entry.hits++
      calibrationMap.set(bracketLabel, entry)
    }

    const calibration: CalibrationPoint[] = Array.from(
      calibrationMap.entries()
    )
      .map(([range, { total, hits, sumPredicted }]) => ({
        range,
        predictedAvg: Math.round((sumPredicted / total) * 100) / 100,
        actualRate: total > 0 ? Math.round((hits / total) * 10000) / 100 : 0,
        count: total,
      }))
      .sort((a, b) => {
        const aStart = parseInt(a.range.split("-")[0])
        const bStart = parseInt(b.range.split("-")[0])
        return aStart - bStart
      })

    return apiSuccess({
      totalReviews,
      overallHitRate: Math.round(overallHitRate * 100) / 100,
      byRiskLevel,
      calibration,
      totalPredictions: totalReviews,
      avgProbabilityError: Math.round(avgProbabilityError * 100) / 100,
    })
  } catch (error) {
    console.error("获取复盘统计失败:", error)
    return apiError("获取复盘统计失败", 500)
  }
}
