import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"
import {
  fetchOdds,
  fetchScores,
  findWorldCupSportKey,
  normalizeBookmakerName,
  type OddsApiMatch,
} from "./odds-api"
import { generatePrediction } from "@/lib/prediction/generate-prediction"
import { generateQwenPrediction } from "@/lib/prediction/qwen-prediction"

/** 同步赔率数据：从 Odds API 抓取并更新到数据库 */
export async function syncOddsData() {
  const sportKey = await findWorldCupSportKey()
  if (!sportKey) throw new Error("未找到世界杯赛事")

  // 获取赔率（含 h2h 和 correct_score 市场）
  const [h2hMatches, csMatches] = await Promise.all([
    fetchOdds(sportKey, "eu,uk", "h2h"),
    fetchOdds(sportKey, "eu", "h2h,correct_score").catch(() => [] as OddsApiMatch[]),
  ])

  const allMatches = new Map<string, OddsApiMatch>()
  for (const m of [...h2hMatches, ...csMatches]) {
    if (!allMatches.has(m.id)) allMatches.set(m.id, m)
    // 合并 bookmakers
    const existing = allMatches.get(m.id)
    if (existing && m.bookmakers) {
      existing.bookmakers = [
        ...(existing.bookmakers ?? []),
        ...m.bookmakers,
      ]
    }
  }

  let oddsUpdated = 0
  let csUpdated = 0

  for (const apiMatch of allMatches.values()) {
    // 按球队名称匹配
    const dbMatch = await findMatchByTeams(apiMatch.home_team, apiMatch.away_team)
    if (!dbMatch) continue

    if (apiMatch.bookmakers) {
      for (const bk of apiMatch.bookmakers) {
        const h2hMarket = bk.markets.find((m) => m.key === "h2h")
        if (h2hMarket) {
          const home = h2hMarket.outcomes.find(
            (o) => o.name === apiMatch.home_team
          )
          const away = h2hMarket.outcomes.find(
            (o) => o.name === apiMatch.away_team
          )
          const draw = h2hMarket.outcomes.find((o) => o.name === "Draw")

          if (home && away && draw) {
            await upsertOdds(dbMatch.id, bk, home.price, draw.price, away.price)
            oddsUpdated++
          }
        }

        const csMarket = bk.markets.find((m) => m.key === "correct_score")
        if (csMarket) {
          for (const outcome of csMarket.outcomes) {
            await upsertCorrectScoreOdds(dbMatch.id, bk, outcome.name, outcome.price)
            csUpdated++
          }
        }
      }
    }
  }

  return { oddsUpdated, csUpdated, sportKey }
}

/** 同步比赛结果：从 Odds API 获取已完成比赛的比分 */
export async function syncResults() {
  const sportKey = await findWorldCupSportKey()
  if (!sportKey) throw new Error("未找到世界杯赛事")

  const scores = await fetchScores(sportKey, 3)
  let updated = 0

  for (const apiMatch of scores) {
    if (!apiMatch.scores || apiMatch.scores.length < 2) continue

    const dbMatch = await findMatchByTeams(apiMatch.home_team, apiMatch.away_team)
    if (!dbMatch) continue
    // 已有比分则跳过
    if (dbMatch.status === "completed") continue

    const homeScore = parseInt(
      apiMatch.scores.find((s) => s.name === apiMatch.home_team)?.score ?? ""
    )
    const awayScore = parseInt(
      apiMatch.scores.find((s) => s.name === apiMatch.away_team)?.score ?? ""
    )

    if (isNaN(homeScore) || isNaN(awayScore)) continue

    const result =
      homeScore > awayScore
        ? "home_win"
        : homeScore < awayScore
          ? "away_win"
          : "draw"

    await prisma.match.update({
      where: { id: dbMatch.id },
      data: {
        status: "completed",
        actualHomeScore: homeScore,
        actualAwayScore: awayScore,
        actualResult: result,
      },
    })
    updated++
  }

  return { updated }
}

/** 生成所有未开始比赛的预测并存入数据库 */
export async function generateAllPredictions() {
  const matches = await prisma.match.findMany({
    where: { status: "scheduled" },
    include: {
      homeTeam: true,
      awayTeam: true,
      predictions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  })

  let generated = 0
  for (const match of matches) {
    // 如果已有预测且在高置信度以上，跳过
    const existing = match.predictions[0]
    if (existing && existing.confidence === "high") continue

    try {
      const prediction = await generatePrediction(match)
      await prisma.prediction.create({
        data: {
          matchId: match.id,
          modelVersion: prediction.modelVersion,
          homeBaseScore: prediction.homeBaseScore,
          awayBaseScore: prediction.awayBaseScore,
          marketScore: prediction.marketScore,
          homeWinProbability: prediction.homeWinProbability,
          drawProbability: prediction.drawProbability,
          awayWinProbability: prediction.awayWinProbability,
          mainDirection: prediction.mainDirection,
          confidence: prediction.confidence,
          riskLevel: prediction.riskLevel,
          riskReasons: JSON.stringify(prediction.riskReasons),
          reportText: prediction.reportText,
        },
      })
      generated++

      // 同时生成千问预测（独立的 Prediction 行）
      const qwenResult = await generateQwenPrediction({
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        matchStage: match.matchStage,
      })
      if (qwenResult) {
        const dir =
          qwenResult.homeWinProbability > qwenResult.drawProbability &&
          qwenResult.homeWinProbability > qwenResult.awayWinProbability
            ? "home_win"
            : qwenResult.awayWinProbability > qwenResult.homeWinProbability &&
                qwenResult.awayWinProbability > qwenResult.drawProbability
              ? "away_win"
              : "draw"
        await prisma.prediction.create({
          data: {
            matchId: match.id,
            modelVersion: "qwen-v1",
            homeWinProbability: qwenResult.homeWinProbability,
            drawProbability: qwenResult.drawProbability,
            awayWinProbability: qwenResult.awayWinProbability,
            mainDirection: dir,
            confidence: qwenResult.confidence,
            reportText: qwenResult.analysis,
          },
        })
        generated++
      }
    } catch (e) {
      console.error(`[预测] ${match.homeTeam.name} vs ${match.awayTeam.name} 失败:`, e)
    }
  }

  return { generated }
}

// ─── helpers ───

async function findMatchByTeams(homeName: string, awayName: string) {
  return prisma.match.findFirst({
    where: {
      homeTeam: { name: { equals: homeName, mode: "insensitive" } },
      awayTeam: { name: { equals: awayName, mode: "insensitive" } },
    },
    select: { id: true, status: true },
  })
}

async function upsertOdds(
  matchId: string,
  bookmaker: { key: string; title: string },
  homeWin: number,
  draw: number,
  awayWin: number
) {
  const normalizedName = normalizeBookmakerName(bookmaker.title)
  const isMajor = ["Bet365", "William Hill", "Pinnacle", "Bwin"].includes(normalizedName)

  // 查找已有记录
  const existing = await prisma.oddsRecord.findFirst({
    where: { matchId, bookmaker: normalizedName },
  })

  const data: Prisma.OddsRecordUpdateInput = {
    currentHomeWin: homeWin,
    currentDraw: draw,
    currentAwayWin: awayWin,
    homeChange: existing ? homeWin - existing.initialHomeWin : null,
    drawChange: existing ? draw - existing.initialDraw : null,
    awayChange: existing ? awayWin - existing.initialAwayWin : null,
    homeChangeRate: existing ? (homeWin - existing.initialHomeWin) / existing.initialHomeWin : null,
    drawChangeRate: existing ? (draw - existing.initialDraw) / existing.initialDraw : null,
    awayChangeRate: existing ? (awayWin - existing.initialAwayWin) / existing.initialAwayWin : null,
    isMajorBookmaker: isMajor,
  }

  if (existing) {
    await prisma.oddsRecord.update({ where: { id: existing.id }, data })
  } else {
    await prisma.oddsRecord.create({
      data: {
        matchId,
        bookmaker: normalizedName,
        initialHomeWin: homeWin,
        initialDraw: draw,
        initialAwayWin: awayWin,
        ...data,
      } as Prisma.OddsRecordCreateInput,
    })
  }
}

async function upsertCorrectScoreOdds(
  matchId: string,
  bookmaker: { key: string; title: string },
  score: string,
  odds: number
) {
  const normalizedName = normalizeBookmakerName(bookmaker.title)

  const existing = await prisma.correctScoreOdds.findFirst({
    where: { matchId, bookmaker: normalizedName, score },
  })

  if (existing) {
    await prisma.correctScoreOdds.update({
      where: { id: existing.id },
      data: { odds },
    })
  } else {
    await prisma.correctScoreOdds.create({
      data: {
        matchId,
        bookmaker: normalizedName,
        score,
        odds,
        isMajorBookmaker: ["Bet365", "William Hill", "Pinnacle", "Bwin"].includes(normalizedName),
      },
    })
  }
}
