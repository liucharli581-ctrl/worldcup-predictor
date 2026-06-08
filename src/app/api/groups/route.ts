import { prisma } from "@/lib/prisma"
import { apiSuccess, apiError } from "@/lib/api-response"

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      where: { groupName: { not: null } },
      orderBy: [{ groupName: "asc" }, { name: "asc" }],
    })

    const groups: Record<string, typeof teams> = {}
    for (const t of teams) {
      const g = t.groupName!
      if (!groups[g]) groups[g] = []
      groups[g].push(t)
    }

    const result = Object.entries(groups)
      .map(([name, teamList]) => ({
        name,
        teams: teamList.map((t) => ({
          id: t.id,
          name: t.name,
          fifaCode: t.fifaCode,
          country: t.country,
          fifaRanking: t.fifaRanking,
          eloRating: t.eloRating,
          worldCupAppearances: t.worldCupAppearances,
          worldCupTitles: t.worldCupTitles,
          goalsFor: t.goalsFor,
          goalsAgainst: t.goalsAgainst,
          avgGoalsFor: t.avgGoalsFor,
          injuryScore: t.injuryScore,
        })),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return apiSuccess(result)
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "获取分组失败", 500)
  }
}
