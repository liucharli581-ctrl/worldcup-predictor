/**
 * 泊松分布足球比分预测模型
 * 基于球队攻防数据计算预期进球，使用泊松分布生成比分概率分布
 */

/**
 * 计算阶乘
 */
function factorial(n: number): number {
  if (n <= 1) return 1
  let result = 1
  for (let i = 2; i <= n; i++) result *= i
  return result
}

/**
 * 泊松分布概率质量函数
 * P(X = k) = (λ^k * e^(-λ)) / k!
 */
export function poissonProb(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k)
}

/**
 * 球队攻防数据
 */
export interface TeamStats {
  name: string
  avgGoalsFor: number
  avgGoalsAgainst: number
}

/**
 * 预期进球计算结果
 */
export interface ExpectedGoals {
  homeLambda: number
  awayLambda: number
}

/**
 * 根据球队相对强度调整场均进球/失球
 * 解决种子数据中强弱队场均数据过于接近的问题
 * 使用 baseScore 或 FIFA 排名等强度指标来缩放
 */
export function adjustTeamStatsByStrength(
  home: TeamStats,
  away: TeamStats,
  homeStrength: number,
  awayStrength: number,
): { home: TeamStats; away: TeamStats } {
  const avg = (homeStrength + awayStrength) / 2
  if (avg <= 0) return { home, away }

  const homeRatio = homeStrength / avg
  const awayRatio = awayStrength / avg

  // 限制缩放范围 [0.5, 2.0]，避免极端值
  const clamp = (v: number) => Math.max(0.5, Math.min(2, v))

  return {
    home: {
      ...home,
      avgGoalsFor: +(home.avgGoalsFor * clamp(homeRatio)).toFixed(2),
      avgGoalsAgainst: +(home.avgGoalsAgainst / clamp(homeRatio)).toFixed(2),
    },
    away: {
      ...away,
      avgGoalsFor: +(away.avgGoalsFor * clamp(awayRatio)).toFixed(2),
      avgGoalsAgainst: +(away.avgGoalsAgainst / clamp(awayRatio)).toFixed(2),
    },
  }
}

/**
 * 计算预期进球 (Expected Goals / λ)
 *
 * 使用标准足球 Poisson 模型方法：
 * λ_home = home_attack × away_defense × league_avg
 * λ_away = away_attack × home_defense × league_avg
 *
 * 其中 attack = 球队场均进球 / 联赛场均进球
 * defense = 球队场均失球 / 联赛场均失球
 */
export function calculateExpectedGoals(
  home: TeamStats,
  away: TeamStats,
  leagueAvgGoals: number,
): ExpectedGoals {
  if (leagueAvgGoals <= 0) {
    return { homeLambda: home.avgGoalsFor, awayLambda: away.avgGoalsFor }
  }

  const homeAttack = home.avgGoalsFor / leagueAvgGoals
  const homeDefense = home.avgGoalsAgainst / leagueAvgGoals
  const awayAttack = away.avgGoalsFor / leagueAvgGoals
  const awayDefense = away.avgGoalsAgainst / leagueAvgGoals

  const homeLambda = Math.max(0.1, homeAttack * awayDefense * leagueAvgGoals)
  const awayLambda = Math.max(0.1, awayAttack * homeDefense * leagueAvgGoals)

  return { homeLambda, awayLambda }
}

/**
 * 比分概率结果
 */
export interface ScoreProb {
  home: number
  away: number
  score: string
  probability: number
  percentage: number
}

const MAX_GOALS = 6

/**
 * 生成完整比分概率分布
 * 计算 0~MAX_GOALS 范围内所有比分组合的概率
 */
export function generateScoreDistribution(
  homeLambda: number,
  awayLambda: number,
): ScoreProb[] {
  const distribution: ScoreProb[] = []

  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      const prob = poissonProb(h, homeLambda) * poissonProb(a, awayLambda)
      if (prob > 0.001) {
        distribution.push({
          home: h,
          away: a,
          score: `${h}-${a}`,
          probability: prob,
          percentage: Math.round(prob * 10000) / 100,
        })
      }
    }
  }

  return distribution.sort((a, b) => b.probability - a.probability)
}

/**
 * 获取 Top-N 最可能比分
 */
export function getTopScores(
  distribution: ScoreProb[],
  n: number = 12,
): ScoreProb[] {
  return distribution.slice(0, n)
}

/**
 * 计算比分累计概率
 */
export function cumulativeProbability(distribution: ScoreProb[]): number {
  return distribution.reduce((sum, s) => sum + s.probability, 0)
}

/**
 * 预测结果概率汇总（主胜/平局/客胜）
 */
export interface MatchOutcome {
  homeWin: number
  draw: number
  awayWin: number
}

/**
 * 从比分分布汇总主胜/平局/客胜概率
 */
export function aggregateOutcome(
  distribution: ScoreProb[],
): MatchOutcome {
  let homeWin = 0
  let draw = 0
  let awayWin = 0

  for (const s of distribution) {
    if (s.home > s.away) homeWin += s.probability
    else if (s.home === s.away) draw += s.probability
    else awayWin += s.probability
  }

  return {
    homeWin: Math.round(homeWin * 10000) / 100,
    draw: Math.round(draw * 10000) / 100,
    awayWin: Math.round(awayWin * 10000) / 100,
  }
}
