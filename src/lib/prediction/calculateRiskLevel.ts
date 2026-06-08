import type { MarketAnalysis } from "./types"

export function calculateRiskLevel(params: {
  scoreDiff: number
  bookmakerConsistency: string
  abnormalCount: number
  injuryScoreHome: number
  injuryScoreAway: number
  drawProbability: number
  totalOddsRecords: number
}): {
  riskLevel: string
  riskReasons: string[]
} {
  const reasons: string[] = []
  let riskScore = 0

  if (params.scoreDiff < 5) {
    riskScore += 30
    reasons.push("双方实力接近")
  } else if (params.scoreDiff < 15) {
    riskScore += 20
  } else if (params.scoreDiff < 30) {
    riskScore += 10
  } else {
    reasons.push("双方实力差距明显")
  }

  if (params.bookmakerConsistency === "low") {
    riskScore += 25
    reasons.push("机构之间存在明显分歧")
  } else if (params.bookmakerConsistency === "medium") {
    riskScore += 15
    reasons.push("部分机构方向不一致")
  }

  if (params.abnormalCount > 2) {
    riskScore += 20
    reasons.push("存在赔率异常波动")
  } else if (params.abnormalCount > 0) {
    riskScore += 10
    reasons.push("个别机构赔率出现异常波动")
  }

  const maxInjury = Math.max(
    params.injuryScoreHome,
    params.injuryScoreAway
  )
  if (maxInjury > 5) {
    riskScore += 20
    reasons.push("球队存在伤病影响")
  }

  if (params.drawProbability >= 30) {
    riskScore += 15
    reasons.push("平局概率较高")
  }

  if (params.totalOddsRecords < 5) {
    riskScore += 10
    reasons.push("赔率数据来源较少")
  }

  let riskLevel: string
  if (riskScore < 20) {
    riskLevel = "low"
    if (reasons.length === 0) reasons.push("综合评估风险较低")
  } else if (riskScore < 35) {
    riskLevel = "medium_low"
    if (reasons.length === 0) reasons.push("风险在可控范围内")
  } else if (riskScore < 50) {
    riskLevel = "medium"
    if (reasons.length === 0) reasons.push("存在一定不确定性")
  } else if (riskScore < 65) {
    riskLevel = "medium_high"
  } else if (riskScore < 80) {
    riskLevel = "high"
  } else {
    riskLevel = "extreme"
  }

  return { riskLevel, riskReasons: reasons }
}
