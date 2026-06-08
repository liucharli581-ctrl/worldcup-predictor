export interface TeamScore {
  baseScore: number
  components: {
    eloScore: number
    recentFormScore: number
    attackScore: number
    defenseScore: number
    historyScore: number
  }
}

export interface OddsChange {
  homeChange: number
  drawChange: number
  awayChange: number
  homeChangeRate: number
  drawChangeRate: number
  awayChangeRate: number
}

export interface MarketAnalysis {
  total: number
  homeDown: number
  homeUp: number
  homeSame: number
  drawDown: number
  drawUp: number
  drawSame: number
  awayDown: number
  awayUp: number
  awaySame: number
  marketDirection: string
  bookmakerConsistency: string
  abnormalCount: number
  marketScore: number
  majorBookmakerDirection: string
}

export interface PredictionResult {
  homeWinProbability: number
  drawProbability: number
  awayWinProbability: number
  mainDirection: string
  confidence: string
  riskLevel: string
  riskReasons: string[]
  homeBaseScore: number
  awayBaseScore: number
  marketScore: number
  reportText: string
}

export interface VirtualSimulationResult {
  virtualBankroll: number
  suggestedMinAmount: number
  suggestedMaxAmount: number
  riskLevel: string
  notice: string
}

const MAJOR_BOOKMAKERS = [
  "Bet365",
  "William Hill",
  "Ladbrokes",
  "Bwin",
  "Interwetten",
  "Unibet",
  "Pinnacle",
  "Coral",
  "Paddy Power",
]

export function isMajorBookmaker(name: string): boolean {
  return MAJOR_BOOKMAKERS.some(
    (b) => b.toLowerCase() === name.toLowerCase()
  )
}
