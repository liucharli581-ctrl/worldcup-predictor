import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiSuccess, apiError } from "@/lib/api-response"
import { analyzeH2H } from "@/lib/analysis"
import type { H2HRecord } from "@/lib/analysis"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const match = await prisma.match.findUnique({
      where: { id },
      select: { homeTeamId: true, awayTeamId: true },
    })

    if (!match) return apiError("比赛不存在", 404)

    const records = await prisma.headToHead.findMany({
      where: {
        OR: [
          { homeTeamId: match.homeTeamId, awayTeamId: match.awayTeamId },
          { homeTeamId: match.awayTeamId, awayTeamId: match.homeTeamId },
        ],
      },
      orderBy: { matchDate: "desc" },
      take: 20,
    })

    // Normalize so homeTeamName is always the home side in the record
    const normalized: H2HRecord[] = records.map((r) => {
      const isSwapped =
        r.homeTeamId === match.awayTeamId &&
        r.awayTeamId === match.homeTeamId
      return {
        homeTeamName: isSwapped ? r.awayTeamName : r.homeTeamName,
        awayTeamName: isSwapped ? r.homeTeamName : r.awayTeamName,
        homeScore: isSwapped ? r.awayScore : r.homeScore,
        awayScore: isSwapped ? r.homeScore : r.awayScore,
        matchDate: r.matchDate.toISOString(),
        competition: r.competition,
      }
    })

    const analysis = analyzeH2H(normalized)

    return apiSuccess({ records: normalized, analysis })
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取历史交锋数据失败"
    return apiError(message, 500)
  }
}
