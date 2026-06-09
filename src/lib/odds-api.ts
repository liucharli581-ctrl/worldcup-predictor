/**
 * The Odds API 客户端
 * 获取博彩公司准确比分赔率
 * 可选依赖：通过 OOKOO_ODDS_API_KEY 环境变量控制
 */

export interface OddsApiCorrectScore {
  score: string
  odds: number
  bookmaker: string
}

const API_KEY = process.env.OOKOO_ODDS_API_KEY || ""
const API_BASE = "https://api.the-odds-api.com/v4"

/**
 * 检查 API 是否已配置
 */
export function isOddsApiConfigured(): boolean {
  return API_KEY.length > 0
}

/**
 * 获取指定比赛的准确比分赔率
 * 如果没有配置 API key，返回 null
 */
export async function fetchCorrectScoreOdds(
  matchId: string,
  homeTeam: string,
  awayTeam: string,
): Promise<OddsApiCorrectScore[] | null> {
  if (!isOddsApiConfigured()) return null

  try {
    const sportKey = "soccer_world_cup"
    const url =
      `${API_BASE}/sports/${sportKey}/events/${matchId}/odds/` +
      `?apiKey=${API_KEY}&regions=uk,eu&markets=correct_score&oddsFormat=decimal`

    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) return null

    const data = await res.json()
    const results: OddsApiCorrectScore[] = []

    if (data?.bookmakers) {
      for (const bm of data.bookmakers) {
        const market = bm.markets?.find(
          (m: any) => m.key === "correct_score",
        )
        if (market?.outcomes) {
          for (const outcome of market.outcomes) {
            results.push({
              score: outcome.name as string,
              odds: outcome.price as number,
              bookmaker: bm.title as string,
            })
          }
        }
      }
    }

    // 对同一比分取多家公司平均赔率
    const grouped = new Map<string, { sum: number; count: number }>()
    for (const r of results) {
      const g = grouped.get(r.score) || { sum: 0, count: 0 }
      g.sum += r.odds
      g.count++
      grouped.set(r.score, g)
    }

    return Array.from(grouped.entries())
      .map(([score, { sum, count }]) => ({
        score,
        odds: Math.round((sum / count) * 100) / 100,
        bookmaker: "多家平均",
      }))
      .sort((a, b) => a.odds - b.odds)
      .slice(0, 15)
  } catch {
    return null
  }
}

/**
 * 获取剩余 API 配额
 */
export async function getApiUsage(): Promise<{
  requestsRemaining: number
  requestsUsed: number
} | null> {
  if (!isOddsApiConfigured()) return null

  try {
    const res = await fetch(
      `${API_BASE}/sports/?apiKey=${API_KEY}`,
      { method: "HEAD" },
    )
    const remaining = res.headers.get("x-requests-remaining")
    const used = res.headers.get("x-requests-used")
    return {
      requestsRemaining: remaining ? parseInt(remaining) : 0,
      requestsUsed: used ? parseInt(used) : 0,
    }
  } catch {
    return null
  }
}
