import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiSuccess, apiError } from "@/lib/api-response"

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
      take: 10,
    })

    // Normalize so homeTeamName is always the home side in the record
    const normalized = records.map((r) => {
      const isSwapped =
        r.homeTeamId === match.awayTeamId &&
        r.awayTeamId === match.homeTeamId
      return {
        id: r.id,
        homeTeamName: isSwapped ? r.awayTeamName : r.homeTeamName,
        awayTeamName: isSwapped ? r.homeTeamName : r.awayTeamName,
        homeScore: isSwapped ? r.awayScore : r.homeScore,
        awayScore: isSwapped ? r.homeScore : r.awayScore,
        matchDate: r.matchDate,
        competition: r.competition,
        stage: r.stage,
      }
    })

    return apiSuccess(normalized)
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取历史交锋数据失败"
    return apiError(message, 500)
  }
}
