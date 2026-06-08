export interface TeamStats {
  name: string
  fifaCode: string
  fifaRanking: number
  eloRating: number
  worldCupAppearances: number
  worldCupTitles: number
  bestWorldCupResult: string
  recent5Wins: number
  recent5Draws: number
  recent5Losses: number
  avgGoalsFor: number
  avgGoalsAgainst: number
  injuryScore: number
}

export interface FactorComparison {
  label: string
  homeValue: string | number
  awayValue: string | number
  advantage: "home" | "away" | "none"
  description: string
}

export interface PredictionResult {
  homeWinProb: number
  drawProb: number
  awayWinProb: number
  predictedScore: string
  confidence: "high" | "medium_high" | "medium" | "medium_low" | "low"
  upsetIndex: "low" | "medium" | "high"
  mainDirection: string
  summary: string
  factors: FactorComparison[]
  riskPoints: string[]
  conclusion: string
}

const BEST_RESULT_SCORE: Record<string, number> = {
  "冠军": 100,
  "亚军": 80,
  "四强": 65,
  "八强": 50,
  "16强": 30,
  "小组赛": 10,
}

function parseBestResult(result: string): number {
  for (const [key, score] of Object.entries(BEST_RESULT_SCORE)) {
    if (result.includes(key)) return score
  }
  if (result.includes("冠军")) return 100
  if (result.includes("亚军")) return 80
  if (result.includes("半决赛") || result.includes("四强")) return 65
  if (result.includes("八强") || result.includes("四分之一")) return 50
  if (result.includes("16强") || result.includes("小组")) return 30
  return 10
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x))
}

export function predictMatch(home: TeamStats, away: TeamStats, isGroupStage = true): PredictionResult {
  // --- Score each factor ---

  // 1. FIFA ranking gap (lower is better)
  const rankGap = away.fifaRanking - home.fifaRanking // positive = home advantage
  const rankScore = sigmoid(rankGap / 30) * 100

  // 2. Elo gap
  const eloGap = home.eloRating - away.eloRating
  const eloScore = sigmoid(eloGap / 150) * 100

  // 3. World Cup experience
  const homeExp = home.worldCupAppearances * 5 + home.worldCupTitles * 20 + parseBestResult(home.bestWorldCupResult) / 2
  const awayExp = away.worldCupAppearances * 5 + away.worldCupTitles * 20 + parseBestResult(away.bestWorldCupResult) / 2
  const expGap = homeExp - awayExp
  const expScore = sigmoid(expGap / 40) * 100

  // 4. Recent form
  const homeFormScore = (home.recent5Wins * 3 + home.recent5Draws) / 15 * 100
  const awayFormScore = (away.recent5Wins * 3 + away.recent5Draws) / 15 * 100
  const formScore = sigmoid((homeFormScore - awayFormScore) / 30) * 100

  // 5. Injury impact (negative = bad for the team)
  const injuryAdvantage = home.injuryScore - away.injuryScore
  const injuryScore = sigmoid(injuryAdvantage / 5) * 100

  // Combined home strength (weights)
  const weights = {
    rank: 0.22,
    elo: 0.25,
    experience: 0.18,
    form: 0.2,
    injury: 0.15,
  }

  const homeStrength =
    rankScore * weights.rank +
    eloScore * weights.elo +
    expScore * weights.experience +
    formScore * weights.form +
    injuryScore * weights.injury

  // --- Convert to probabilities ---
  // Map strength to win probability using a logistic curve
  const rawHomeWinProb = sigmoid((homeStrength - 50) / 12) * 100

  // Draw probability is highest when teams are close
  const drawBase = Math.max(15, 40 - Math.abs(homeStrength - 50) * 0.5)
  // Add group stage uncertainty
  const groupUncertainty = isGroupStage ? 5 : 0
  const drawProb = Math.min(35, drawBase + groupUncertainty)

  // Scale home/away to fill remaining probability
  const remaining = 100 - drawProb
  const homeWinProb = Math.round((rawHomeWinProb / 100) * remaining)
  const awayWinProb = remaining - homeWinProb

  // --- Predicted score ---
  const homeGoals = Math.round(home.avgGoalsFor * (homeStrength / 50) * 10) / 10
  const awayGoals = Math.round(away.avgGoalsFor * ((100 - homeStrength) / 50) * 10) / 10
  const predictedHome = Math.round(homeGoals)
  const predictedAway = Math.round(awayGoals)
  const predictedScore = predictedHome >= predictedAway
    ? `${Math.max(1, predictedHome)} - ${predictedAway}`
    : `${predictedHome} - ${Math.max(1, predictedAway)}`

  // --- Confidence ---
  const certainty = Math.abs(homeStrength - 50)
  let confidence: PredictionResult["confidence"]
  if (certainty > 30) confidence = "high"
  else if (certainty > 20) confidence = "medium_high"
  else if (certainty > 12) confidence = "medium"
  else if (certainty > 6) confidence = "medium_low"
  else confidence = "low"

  // --- Upset index ---
  let upsetIndex: PredictionResult["upsetIndex"]
  if (certainty > 28) upsetIndex = "low"
  else if (certainty > 15) upsetIndex = "medium"
  else upsetIndex = "high"

  // --- Main direction ---
  let mainDirection: string
  if (homeWinProb >= 55) {
    mainDirection = `${home.name} 优势`
    if (homeWinProb >= 70) mainDirection = `${home.name} 优势明显`
  } else if (awayWinProb >= 55) {
    mainDirection = `${away.name} 优势`
    if (awayWinProb >= 70) mainDirection = `${away.name} 优势明显`
  } else {
    mainDirection = "双方实力接近"
  }

  // --- Factor comparison table ---
  const factors: FactorComparison[] = [
    {
      label: "FIFA 排名",
      homeValue: `#${home.fifaRanking}`,
      awayValue: `#${away.fifaRanking}`,
      advantage: home.fifaRanking < away.fifaRanking ? "home" : away.fifaRanking < home.fifaRanking ? "away" : "none",
      description: home.fifaRanking < away.fifaRanking ? `${home.name} 排名领先` : `${away.name} 排名领先`,
    },
    {
      label: "Elo 评分",
      homeValue: home.eloRating,
      awayValue: away.eloRating,
      advantage: home.eloRating > away.eloRating ? "home" : away.eloRating > home.eloRating ? "away" : "none",
      description: home.eloRating > away.eloRating ? `${home.name} 评分更高` : `${away.name} 评分更高`,
    },
    {
      label: "世界杯经验",
      homeValue: `${home.worldCupAppearances} 次`,
      awayValue: `${away.worldCupAppearances} 次`,
      advantage: home.worldCupAppearances > away.worldCupAppearances ? "home" : away.worldCupAppearances > home.worldCupAppearances ? "away" : "none",
      description: home.worldCupAppearances > away.worldCupAppearances ? `${home.name} 经验更丰富` : `${away.name} 经验更丰富`,
    },
    {
      label: "世界杯冠军",
      homeValue: home.worldCupTitles > 0 ? `${home.worldCupTitles} 次` : "无",
      awayValue: away.worldCupTitles > 0 ? `${away.worldCupTitles} 次` : "无",
      advantage: home.worldCupTitles > away.worldCupTitles ? "home" : away.worldCupTitles > home.worldCupTitles ? "away" : "none",
      description: home.worldCupTitles > 0 ? `${home.name} 有冠军底蕴` : away.worldCupTitles > 0 ? `${away.name} 有冠军底蕴` : "均无冠军经历",
    },
    {
      label: "近期状态 (近5场)",
      homeValue: `${home.recent5Wins}胜 ${home.recent5Draws}平 ${home.recent5Losses}负`,
      awayValue: `${away.recent5Wins}胜 ${away.recent5Draws}平 ${away.recent5Losses}负`,
      advantage: homeFormScore > awayFormScore ? "home" : awayFormScore > homeFormScore ? "away" : "none",
      description: homeFormScore > awayFormScore ? `${home.name} 状态更好` : `${away.name} 状态更好`,
    },
    {
      label: "伤病影响",
      homeValue: home.injuryScore < 0 ? `有伤病 (${home.injuryScore})` : "阵容齐整",
      awayValue: away.injuryScore < 0 ? `有伤病 (${away.injuryScore})` : "阵容齐整",
      advantage: home.injuryScore > away.injuryScore ? "home" : away.injuryScore > home.injuryScore ? "away" : "none",
      description: home.injuryScore < 0 ? `${home.name} 有伤病困扰` : away.injuryScore < 0 ? `${away.name} 有伤病困扰` : "双方阵容完整",
    },
  ]

  // --- Risk analysis ---
  const riskPoints: string[] = []
  if (isGroupStage) {
    riskPoints.push("小组赛首轮偶然性较高，历史数据显示冷门频发")
  }
  if (certainty < 15) {
    riskPoints.push("双方实力接近，比赛结果难以预测")
  }
  if (away.recent5Wins >= 3 && away.fifaRanking > home.fifaRanking + 20) {
    riskPoints.push(`${away.name} 近期状态不错，具备反击爆冷能力`)
  }
  if (home.injuryScore < -3) {
    riskPoints.push(`${home.name} 伤病影响较大，可能影响整体发挥`)
  }
  if (away.injuryScore < -3) {
    riskPoints.push(`${away.name} 伤病影响较大，可能影响整体发挥`)
  }
  if (Math.abs(home.avgGoalsFor - away.avgGoalsFor) < 0.3) {
    riskPoints.push("两队场均进球数接近，比赛可能陷入胶着")
  }
  if (riskPoints.length === 0) {
    riskPoints.push("数据层面无明显异常信号，但仍需注意足球比赛的不确定性")
  }

  // --- Summary text ---
  const homeAdvantages = factors.filter((f) => f.advantage === "home").length
  const awayAdvantages = factors.filter((f) => f.advantage === "away").length

  let summary: string
  if (homeWinProb >= 60) {
    summary = `${home.name} 在多项数据指标上占据优势（${homeAdvantages}/${factors.length}项领先），结合排名、经验和近期状态，综合胜面更大。${away.name} 并非没有机会，但需要超常发挥。`
  } else if (awayWinProb >= 60) {
    summary = `${away.name} 在数据层面表现更优（${awayAdvantages}/${factors.length}项领先），综合实力占优。${home.name} 想要取分需要依靠主场优势或战术部署。`
  } else {
    summary = `${home.name} 与 ${away.name} 实力较为接近（${homeAdvantages}:${awayAdvantages} 的数据优势比），比赛存在较大变数。关键球员的临场发挥可能决定比赛走向。`
  }

  // --- Conclusion ---
  let conclusion: string
  if (homeWinProb >= 65) {
    conclusion = `${home.name} 胜面更高，但并非低风险比赛。更稳妥的判断方向是 ${home.name} 不败。`
  } else if (awayWinProb >= 65) {
    conclusion = `${away.name} 胜面更高，但并非低风险比赛。更稳妥的判断方向是 ${away.name} 不败。`
  } else if (homeWinProb >= 50) {
    conclusion = `双方差距不大，${home.name} 略占优势。建议关注临场阵容和赛前赔率变化。`
  } else if (awayWinProb >= 50) {
    conclusion = `双方差距不大，${away.name} 略占优势。建议关注临场阵容和赛前赔率变化。`
  } else {
    conclusion = "双方实力非常接近，任何结果都有可能。建议关注更多实时数据再做判断。"
  }

  const result: PredictionResult = {
    homeWinProb: Math.round(homeWinProb),
    drawProb: Math.round(drawProb),
    awayWinProb: Math.round(awayWinProb),
    predictedScore,
    confidence,
    upsetIndex,
    mainDirection,
    summary,
    factors,
    riskPoints,
    conclusion,
  }

  return result
}

export const confidenceLabel: Record<string, string> = {
  high: "高",
  medium_high: "中高",
  medium: "中等",
  medium_low: "中低",
  low: "低",
}

export const upsetLabel: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
}

export function confidenceColor(level: string): string {
  const map: Record<string, string> = {
    high: "text-green-600 bg-green-50 dark:bg-green-950/20 dark:text-green-400",
    medium_high: "text-lime-600 bg-lime-50 dark:bg-lime-950/20 dark:text-lime-400",
    medium: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 dark:text-yellow-400",
    medium_low: "text-orange-600 bg-orange-50 dark:bg-orange-950/20 dark:text-orange-400",
    low: "text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400",
  }
  return map[level] ?? ""
}

export function upsetColor(level: string): string {
  const map: Record<string, string> = {
    low: "text-green-600 bg-green-50 dark:bg-green-950/20 dark:text-green-400",
    medium: "text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400",
    high: "text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400",
  }
  return map[level] ?? ""
}
