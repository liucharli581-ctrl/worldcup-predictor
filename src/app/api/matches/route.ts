import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiSuccess, apiError } from "@/lib/api-response"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const competition = searchParams.get("competition")
    const status = searchParams.get("status")
    const team = searchParams.get("team")
    const date = searchParams.get("date")

    const where: Record<string, unknown> = {}

    if (competition) where.competition = competition
    if (status) where.status = status
    if (date) {
      const dateStart = new Date(date)
      const dateEnd = new Date(date)
      dateEnd.setDate(dateEnd.getDate() + 1)
      where.matchDate = { gte: dateStart, lt: dateEnd }
    }
    if (team) {
      where.OR = [
        { homeTeam: { name: { contains: team } } },
        { awayTeam: { name: { contains: team } } },
      ]
    }

    const matches = await prisma.match.findMany({
      where: where as never,
      include: {
        homeTeam: { select: { id: true, name: true, fifaCode: true } },
        awayTeam: { select: { id: true, name: true, fifaCode: true } },
        predictions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { matchDate: "desc" },
    })
    return apiSuccess(matches)
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取比赛列表失败"
    return apiError(message, 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const match = await prisma.match.create({
      data: {
        competition: body.competition,
        matchStage: body.matchStage,
        matchDate: new Date(body.matchDate),
        homeTeamId: body.homeTeamId,
        awayTeamId: body.awayTeamId,
        neutralGround: body.neutralGround ?? false,
      },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
      },
    })
    return apiSuccess(match, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建比赛失败"
    return apiError(message, 500)
  }
}
