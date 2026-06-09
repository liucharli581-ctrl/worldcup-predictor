/**
 * 比分预测融合引擎
 * 融合泊松模型概率、历史交锋修正、市场赔率
 */

import {
  calculateExpectedGoals,
  generateScoreDistribution,
  getTopScores,
  aggregateOutcome,
  type TeamStats,
  type ScoreProb,
} from "./poisson-model"
import type { H2HRecord } from "./analysis"

/**
 * 模型配置
 */
export interface PredictorConfig {
  /** 泊松模型权重 (0-1) */
  modelWeight: number
  /** H2H 历史权重 (0-1) */
  h2hWeight: number
  /** 市场赔率权重 (0-1) */
  marketWeight: number
  /** 联赛场均进球 */
  leagueAvgGoals: number
}

const DEFAULT_CONFIG: PredictorConfig = {
  modelWeight: 0.5,
  h2hWeight: 0.2,
  marketWeight: 0.3,
  leagueAvgGoals: 2.5,
}

/**
 * 市场赔率数据
 */
export interface MarketOddsItem {
  score: string
  odds: number
  impliedProb: number
}

/**
 * 最终比分预测
 */
export interface ScorePrediction {
  score: string
  /** 模型概率 (%) */
  modelProb: number
  /** 市场隐含概率 (%) */
  marketProb: number | null
  /** 融合后最终概率 (%) */
  fusedProb: number
  /** 价值信号: positive=模型高于市场, negative=模型低于市场, neutral=接近 */
  valueSignal: "positive" | "negative" | "neutral"
  /** 期望值 (模型概率 × 赔率 - 1) */
  expectedValue: number | null
}

/**
 * 融合预测结果
 */
export interface FusionResult {
  predictions: ScorePrediction[]
  outcomeSummary: {
    homeWin: number
    draw: number
    awayWin: number
  }
  modelConfidence: number
  hasMarketData: boolean
}

/**
 * 从 H2H 记录计算历史比分频率
 */
function computeH2HScoreFreq(
  records: H2HRecord[],
): Map<string, number> {
  const freq = new Map<string, number>()
  for (const r of records) {
    const key = `${r.homeScore}-${r.awayScore}`
    freq.set(key, (freq.get(key) || 0) + 1)
  }
  return freq
}

/**
 * 融合预测主函数
 *
 * @param home 主队攻防数据
 * @param away 客队攻防数据
 * @param marketOdds 市场赔率（可选）
 * @param h2hRecords 历史交锋（可选）
 * @param config 模型配置
 */
export function predictCorrectScores(
  home: TeamStats,
  away: TeamStats,
  marketOdds?: MarketOddsItem[] | null,
  h2hRecords?: H2HRecord[] | null,
  config?: Partial<PredictorConfig>,
): FusionResult {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  // 1. 泊松模型生成比分分布
  const { homeLambda, awayLambda } = calculateExpectedGoals(
    home,
    away,
    cfg.leagueAvgGoals,
  )
  const fullDistribution = generateScoreDistribution(homeLambda, awayLambda)
  const topScores = getTopScores(fullDistribution, 15)

  // 2. 构建模型概率 Map
  const modelProbMap = new Map<string, number>()
  const outcomeFromModel = aggregateOutcome(fullDistribution)

  for (const s of fullDistribution) {
    modelProbMap.set(s.score, s.probability)
  }

  // 3. 构建市场赔率 Map
  const marketProbMap = new Map<string, number>()
  if (marketOdds) {
    for (const m of marketOdds) {
      marketProbMap.set(m.score, m.impliedProb / 100)
    }
  }

  // 4. 构建 H2H 频率
  const h2hFreq = h2hRecords ? computeH2HScoreFreq(h2hRecords) : new Map()
  const totalH2H = h2hRecords?.length || 0

  // 5. 融合计算 Top 比分
  const predictions: ScorePrediction[] = topScores.map((s) => {
    const modelP = s.probability
    const marketP = marketProbMap.get(s.score)
    const h2hP = totalH2H > 0 ? (h2hFreq.get(s.score) || 0) / totalH2H : 0

    // 融合权重
    let fused = modelP * cfg.modelWeight
    if (marketP !== undefined) fused += marketP * cfg.marketWeight
    if (h2hP > 0) fused += h2hP * cfg.h2hWeight
    // 如果市场有数据但此比分缺失，模型权重相应提高
    if (marketP === undefined && cfg.marketWeight > 0) {
      const adjustedModelWeight = cfg.modelWeight + cfg.marketWeight * 0.5
      const remainingWeight =
        adjustedModelWeight + (h2hP > 0 ? cfg.h2hWeight : 0)
      fused =
        modelP * (adjustedModelWeight / remainingWeight) +
        h2hP * (cfg.h2hWeight / remainingWeight)
    }

    // 价值信号
    let valueSignal: "positive" | "negative" | "neutral" = "neutral"
    let expectedValue: number | null = null
    if (marketP !== undefined && marketOdds) {
      const oddsEntry = marketOdds.find((m) => m.score === s.score)
      if (oddsEntry && marketP > 0) {
        const odds = oddsEntry.odds
        const ev = modelP * odds - 1
        expectedValue = Math.round(ev * 1000) / 1000
        const diff = modelP - marketP
        if (diff > 0.02) valueSignal = "positive"
        else if (diff < -0.02) valueSignal = "negative"
      }
    }

    return {
      score: s.score,
      modelProb: Math.round(modelP * 10000) / 100,
      marketProb: marketP !== undefined ? Math.round(marketP * 10000) / 100 : null,
      fusedProb: Math.round(fused * 10000) / 100,
      valueSignal,
      expectedValue,
    }
  })

  // 按融合概率排序
  predictions.sort((a, b) => b.fusedProb - a.fusedProb)

  // 模型置信度：最高概率的集中度
  const topProb = predictions[0]?.fusedProb || 0
  const top3Cumulative = predictions
    .slice(0, 3)
    .reduce((sum, p) => sum + p.fusedProb, 0)

  return {
    predictions,
    outcomeSummary: outcomeFromModel,
    modelConfidence: Math.round(top3Cumulative * 10) / 10,
    hasMarketData: marketOdds !== null && marketOdds !== undefined,
  }
}
