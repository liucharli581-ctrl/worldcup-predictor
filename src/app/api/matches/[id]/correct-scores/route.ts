import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiSuccess, apiError } from "@/lib/api-response"
import { analyzeCorrectScores } from "@/lib/analysis"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const records = await prisma.correctScoreOdds.findMany({
      where: { matchId: id, isMajorBookmaker: true },
      orderBy: { odds: "asc" },
    })

    if (records.length === 0) {
      return apiSuccess({ items: [], analysis: [] })
    }

    const analysis = analyzeCorrectScores(
      records.map(r => ({ score: r.score, odds: r.odds }))
    )

    return apiSuccess({ items: records, analysis })
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取准确比分赔率失败"
    return apiError(message, 500)
  }
}
