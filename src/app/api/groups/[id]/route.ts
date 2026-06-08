import { prisma } from "@/lib/prisma"
import { apiSuccess, apiError } from "@/lib/api-response"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const groupName = id.toUpperCase()

    const teams = await prisma.team.findMany({
      where: { groupName },
      orderBy: { name: "asc" },
    })

    if (teams.length === 0) {
      return apiError("未找到该分组", 404)
    }

    const allMatches = await prisma.match.findMany({
      where: {
        OR: [
          { homeTeam: { groupName } },
          { awayTeam: { groupName } },
        ],
      },
      include: {
        homeTeam: { select: { id: true, name: true, fifaCode: true, groupName: true } },
        awayTeam: { select: { id: true, name: true, fifaCode: true, groupName: true } },
        predictions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { matchDate: "asc" },
    })

    return apiSuccess({ name: groupName, teams, matches: allMatches })
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "获取分组详情失败", 500)
  }
}
