/**
 * 足球数据分析核心引擎
 * 仅用于数据分析、市场信号观察、虚拟模拟和赛后复盘，
 * 不构成任何真实投注建议。
 */

export interface TeamAnalysisData {
  id: string
  name: string
  fifaCode: string
  fifaRanking: number
  eloRating: number
  worldCupTitles: number
  worldCupAppearances: number
  totalWins: number
  totalDraws: number
  totalLosses: number
  totalMatches: number
  goalsFor: number
  goalsAgainst: number
  recent5Wins: number
  recent5Draws: number
  recent5Losses: number
  avgGoalsFor: number
  avgGoalsAgainst: number
  injuryScore: number
  baseScore?: number
  formLabel?: string
}

export interface OddsAnalysisData {
  bookmaker: string
  currentHomeWin: number
  currentDraw: number
  currentAwayWin: number
  isMajorBookmaker: boolean
  isAbnormal: boolean
}

export interface ValueSignal {
  selectionName: string
  modelProbability: number
  odds: number
  impliedProbability: number
  valueGap: number
  expectedValue: number
  riskLevel: string
  valueSignal: "positive" | "neutral" | "negative"
}

export interface MatchAnalysisResult {
  homeBaseScore: number
  awayBaseScore: number
  marketScore: number
  homeWinProbability: number
  drawProbability: number
  awayWinProbability: number
  mainDirection: string
  confidence: string
  riskLevel: string
  riskReasons: string[]
  report: string
  valueSignals: ValueSignal[]
}

/**
 * 计算球队综合基础分 (0-100)
 */
export function calculateBaseScore(team: TeamAnalysisData): number {
  const rankingScore = Math.max(0, 100 - team.fifaRanking * 1.2)
  const eloScore = Math.min(100, ((team.eloRating - 1300) / 800) * 100)
  const historyScore = Math.min(100, team.worldCupTitles * 20 + team.worldCupAppearances * 3)
  const formScore = team.totalMatches > 0
    ? ((team.totalWins / team.totalMatches) * 60 + (team.totalDraws / team.totalMatches) * 30)
    : 40
  const goalScore = (team.avgGoalsFor - team.avgGoalsAgainst) * 10 + 50
  const injuryPenalty = team.injuryScore ? Math.abs(team.injuryScore) * 3 : 0

  const score = rankingScore * 0.3 + eloScore * 0.25 + historyScore * 0.15 + formScore * 0.2 + goalScore * 0.1 - injuryPenalty
  return Math.round(Math.max(0, Math.min(100, score)))
}

/**
 * 生成状态标签
 */
export function calculateFormLabel(team: TeamAnalysisData): string {
  if (team.totalMatches === 0) return "数据不足"

  const winRate = team.totalWins / team.totalMatches
  const recentWinRate = team.recent5Wins / 5
  const goalDiff = team.avgGoalsFor - team.avgGoalsAgainst

  if (winRate >= 0.55 && recentWinRate >= 0.6 && goalDiff > 0.5) return "强势稳定"
  if (winRate >= 0.45 && recentWinRate >= 0.4) return "状态良好"
  if (winRate >= 0.35 && recentWinRate >= 0.2) return "状态起伏"
  if (recentWinRate < 0.2 && goalDiff < -0.5) return "持续低迷"
  return "表现一般"
}

/**
 * 计算方向文本
 */
export function calculateDirection(homeProb: number, drawProb: number, awayProb: number): string {
  if (homeProb > 0.5) return "home_win"
  if (awayProb > 0.5) return "away_win"
  if (homeProb > awayProb + 0.05) return "home_win"
  if (awayProb > homeProb + 0.05) return "away_win"
  return "draw"
}

/**
 * 计算置信度
 */
export function calculateConfidence(homeProb: number, drawProb: number, awayProb: number): string {
  const maxProb = Math.max(homeProb, drawProb, awayProb)
  if (maxProb >= 0.65) return "高"
  if (maxProb >= 0.50) return "中高"
  if (maxProb >= 0.40) return "中等"
  if (maxProb >= 0.35) return "中低"
  return "低"
}

/**
 * 计算风险等级
 * baseScoreDiff 越大 → 越一边倒 → 风险越低
 */
export function calculateRiskLevel(baseScoreDiff: number, hasOdds: boolean): string {
  if (!hasOdds) return "中高"
  if (baseScoreDiff > 20) return "中低"
  if (baseScoreDiff > 10) return "中等"
  return "中高"
}

/**
 * 生成风险原因列表
 */
export function generateRiskReasons(
  homeTeam: TeamAnalysisData,
  awayTeam: TeamAnalysisData,
  homeProb: number,
  drawProb: number,
  hasOdds: boolean,
  valueSignals: ValueSignal[],
): string[] {
  const reasons: string[] = []

  if (!hasOdds) reasons.push("缺少赔率市场数据，当前仅为基础面判断")
  if (drawProb >= 0.28) reasons.push("平局概率偏高，需警惕平局风险")
  if (Math.abs(homeTeam.baseScore! - awayTeam.baseScore!) < 8) reasons.push("双方实力接近，比赛结果不确定性较高")
  if (homeTeam.injuryScore && homeTeam.injuryScore < -3) reasons.push(`${homeTeam.name}伤病影响较大`)
  if (awayTeam.injuryScore && awayTeam.injuryScore < -3) reasons.push(`${awayTeam.name}伤病影响较大`)
  if (valueSignals.some(v => v.valueSignal === "positive")) reasons.push("存在赔率价值信号，市场隐含概率与模型概率存在偏差")
  if (homeProb > 0.6 && awayTeam.avgGoalsAgainst < homeTeam.avgGoalsFor) reasons.push("强队进攻效率与弱队防守数据对比明显")

  if (reasons.length === 0) reasons.push("基础面判断为主，建议关注临场阵容变动")
  return reasons
}

/**
 * 生成分析报告
 */
export function generateReport(
  homeTeam: TeamAnalysisData,
  awayTeam: TeamAnalysisData,
  direction: string,
  confidence: string,
  riskLevel: string,
  reasons: string[],
  valueSignals: ValueSignal[],
): string {
  const directionText: Record<string, string> = {
    home_win: `数据分析显示${homeTeam.name}方向占优`,
    away_win: `数据分析显示${awayTeam.name}方向占优`,
    draw: "双方实力接近，平局需重点关注",
  }

  let report = directionText[direction] || "双方实力接近"

  const baseScoreDiff = Math.abs(homeTeam.baseScore! - awayTeam.baseScore!)
  if (baseScoreDiff > 15) {
    report += `；综合基础分差值为${baseScoreDiff.toFixed(0)}分，实力差距明显`
  } else if (baseScoreDiff > 5) {
    report += `；综合基础分差值为${baseScoreDiff.toFixed(0)}分，一方略占优势`
  } else {
    report += "；综合基础分差值在5分以内，双方实力接近"
  }

  const positiveSignals = valueSignals.filter(v => v.valueSignal === "positive")
  if (positiveSignals.length > 0) {
    report += `；市场隐含概率与模型概率存在偏差，出现${positiveSignals.length}个价值信号，建议关注对应选项`
  }

  report += `；当前风险等级为${riskLevel}，${confidence}置信度`
  return report
}

/**
 * 计算赔率隐含概率
 */
export function impliedProbability(odds: number): number {
  return odds > 0 ? 1 / odds : 0
}

/**
 * 计算 Expected Value
 */
export function expectedValue(modelProb: number, odds: number): number {
  return modelProb * odds - 1
}

/**
 * 计算价值信号
 */
export function calculateValueSignals(
  homeProb: number,
  drawProb: number,
  awayProb: number,
  oddsRecords: OddsAnalysisData[],
): ValueSignal[] {
  const signals: ValueSignal[] = []
  const majorOdds = oddsRecords.find(o => o.isMajorBookmaker && !o.isAbnormal)
    || oddsRecords[0]
  if (!majorOdds) return signals

  const selections: Array<{ name: string; prob: number; odds: number; risk: string }> = [
    { name: "主胜", prob: homeProb, odds: majorOdds.currentHomeWin, risk: "中等" },
    { name: "平局", prob: drawProb, odds: majorOdds.currentDraw, risk: "中高" },
    { name: "客胜", prob: awayProb, odds: majorOdds.currentAwayWin, risk: "中等" },
  ]

  for (const sel of selections) {
    const ip = impliedProbability(sel.odds)
    const ev = expectedValue(sel.prob, sel.odds)
    const vg = sel.prob - ip
    let signal: "positive" | "neutral" | "negative" = "neutral"
    if (ev > 0.05) signal = "positive"
    else if (ev < -0.05) signal = "negative"

    signals.push({
      selectionName: sel.name,
      modelProbability: Math.round(sel.prob * 1000) / 1000,
      odds: sel.odds,
      impliedProbability: Math.round(ip * 1000) / 1000,
      valueGap: Math.round(vg * 1000) / 1000,
      expectedValue: Math.round(ev * 1000) / 1000,
      riskLevel: sel.risk,
      valueSignal: signal,
    })
  }

  return signals
}

/**
 * 小组实力分层
 */
export function classifyGroupTiers(teams: TeamAnalysisData[]): Array<{ tier: string; teams: TeamAnalysisData[] }> {
  const sorted = [...teams].sort((a, b) => (b.baseScore || 0) - (a.baseScore || 0))
  if (sorted.length === 0) return []

  const tiers: Array<{ tier: string; teams: TeamAnalysisData[] }> = []
  const maxScore = sorted[0].baseScore || 80

  const tierGroups: Array<{ name: string; threshold: number }> = [
    { name: "第一梯队", threshold: 0.85 },
    { name: "第二梯队", threshold: 0.65 },
    { name: "第三梯队", threshold: 0 },
  ]

  let startIdx = 0
  for (const tg of tierGroups) {
    const group: TeamAnalysisData[] = []
    while (startIdx < sorted.length) {
      const ratio = (sorted[startIdx].baseScore || 0) / maxScore
      if (ratio < tg.threshold && startIdx > 0) break
      group.push(sorted[startIdx])
      startIdx++
    }
    if (group.length > 0) tiers.push({ tier: tg.name, teams: group })
  }

  return tiers
}

/**
 * 判断是否为关键战
 */
export function isKeyMatch(homeBaseScore: number, awayBaseScore: number): boolean {
  const diff = Math.abs(homeBaseScore - awayBaseScore)
  return diff < 10
}

/**
 * 生成小组形势总结
 */
export function generateGroupSummary(tiers: Array<{ tier: string; teams: TeamAnalysisData[] }>): string {
  const parts: string[] = []
  for (const t of tiers) {
    parts.push(`${t.tier}：${t.teams.map(tm => tm.name).join("、")}`)
  }

  const top = tiers[0]?.teams || []
  const second = tiers[1]?.teams || []
  const bottom = tiers[2]?.teams || []

  let summary = ""
  if (top.length === 1) {
    summary += `${top[0].name}基础实力领先；`
  } else if (top.length > 1) {
    summary += `${top.map(t => t.name).join("、")}实力接近，小组头名竞争激烈；`
  }

  if (second.length === 2) {
    summary += `${second.map(t => t.name).join("、")}接近，是小组出线关键竞争者；`
  } else if (second.length > 0) {
    summary += `${second.map(t => t.name).join("、")}具备竞争力；`
  }

  if (bottom.length > 0) {
    summary += `${bottom.map(t => t.name).join("、")}基础分偏低，但可能影响小组出线走势。`
  }

  return summary || "小组实力分布较为均衡，各队均有争夺出线机会。"
}
