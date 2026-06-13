/**
 * The Odds API v4 client
 * https://the-odds-api.com/
 */
const BASE = "https://api.the-odds-api.com/v4"

const API_KEY = process.env.OOKOO_ODDS_API_KEY ?? ""

export interface OddsApiSport {
  key: string
  group: string
  title: string
  description: string
  active: boolean
  has_outrights: boolean
}

export interface OddsApiOutcome {
  name: string
  price: number
  point?: number
}

export interface OddsApiMarket {
  key: string
  last_update: string
  outcomes: OddsApiOutcome[]
}

export interface OddsApiBookmaker {
  key: string
  title: string
  last_update: string
  markets: OddsApiMarket[]
}

export interface OddsApiMatch {
  id: string
  sport_key: string
  sport_title: string
  commence_time: string
  home_team: string
  away_team: string
  bookmakers?: OddsApiBookmaker[]
  scores?: { name: string; score: string }[]
}

async function request<T>(path: string): Promise<T> {
  const url = `${BASE}${path}&apiKey=${API_KEY}`
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Odds API ${res.status}: ${text.slice(0, 200)}`)
  }
  const remaining = res.headers.get("x-requests-remaining")
  if (remaining && parseInt(remaining) < 100) {
    console.warn(`[Odds API] 剩余请求数: ${remaining}`)
  }
  return res.json()
}

/** 获取所有可用的体育项目 */
export async function fetchSports(): Promise<OddsApiSport[]> {
  return request<OddsApiSport[]>(`/sports/`)
}

/** 获取指定赛事的赔率 */
export async function fetchOdds(
  sport: string,
  regions = "eu",
  markets = "h2h"
): Promise<OddsApiMatch[]> {
  return request<OddsApiMatch[]>(
    `/sports/${sport}/odds/?regions=${regions}&markets=${markets}`
  )
}

/** 获取指定赛事的比分（含已结束比赛） */
export async function fetchScores(
  sport: string,
  daysFrom = 3
): Promise<OddsApiMatch[]> {
  return request<OddsApiMatch[]>(
    `/sports/${sport}/scores/?daysFrom=${daysFrom}`
  )
}

/** 从 API 找到世界杯的 sport key */
export async function findWorldCupSportKey(): Promise<string | null> {
  try {
    const sports = await fetchSports()
    // 先精确匹配
    const wc = sports.find(
      (s) =>
        s.title.toLowerCase().includes("world cup") &&
        s.title.includes("2026")
    )
    if (wc) return wc.key

    // 回退：匹配 soccer + world cup
    const soccerWc = sports.find(
      (s) =>
        s.group === "Soccer" &&
        s.title.toLowerCase().includes("world cup")
    )
    if (soccerWc) return soccerWc.key

    // 再回退：任意 soccer 赛事
    const soccer = sports.find((s) => s.group === "Soccer" && s.active)
    return soccer?.key ?? null
  } catch (e) {
    console.error("[Odds API] 获取体育列表失败:", e)
    return null
  }
}

/** 标准化 bookmaker 名称 */
export function normalizeBookmakerName(raw: string): string {
  const map: Record<string, string> = {
    bet365: "Bet365",
    williamhill: "William Hill",
    pinnacle: "Pinnacle",
    bwin: "Bwin",
    draftkings: "DraftKings",
    fanduel: "FanDuel",
    betmgm: "BetMGM",
    caesars: "Caesars",
    pointsbet: "PointsBet",
    unibet: "Unibet",
  }
  return map[raw.toLowerCase()] ?? raw
}
