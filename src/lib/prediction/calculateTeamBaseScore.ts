import type { Team } from "@/generated/prisma"
import type { TeamScore } from "./types"

export function normalizeElo(elo: number | null): number {
  if (!elo) return 50
  return Math.min(100, Math.max(0, ((elo - 1300) / 600) * 100))
}

export function calculateRecentForm(team: Team): number {
  const recent5 = team.recent5Wins ?? 0
  const recent10 = team.recent10Wins ?? 0

  const recent5Score = (recent5 / 5) * 100
  const recent10Score = (recent10 / 10) * 100

  return recent5Score * 0.6 + recent10Score * 0.4
}

export function normalizeAttack(avgGoalsFor: number | null): number {
  if (!avgGoalsFor) return 50
  return Math.min(100, (avgGoalsFor / 3) * 100)
}

export function normalizeDefense(avgGoalsAgainst: number | null): number {
  if (!avgGoalsAgainst) return 50
  return Math.min(100, Math.max(0, 100 - (avgGoalsAgainst / 3) * 100))
}

export function calculateWorldCupHistory(team: Team): number {
  let score = 40
  if (team.worldCupTitles && team.worldCupTitles > 0) score += 30
  if (team.bestWorldCupResult === "Winner") score += 30
  else if (team.bestWorldCupResult === "Runner-up") score += 25
  else if (team.bestWorldCupResult === "Semi-finals") score += 20
  else if (team.bestWorldCupResult === "Quarter-finals") score += 15
  else if (team.bestWorldCupResult?.includes("Round")) score += 10
  if (team.worldCupAppearances && team.worldCupAppearances >= 5) score += 10

  return Math.min(100, score)
}

export function calculateTeamBaseScore(team: Team): TeamScore {
  const eloScore = Math.round(normalizeElo(team.eloRating) * 0.25)
  const recentFormScore = Math.round(calculateRecentForm(team) * 0.25)
  const attackScore = Math.round(normalizeAttack(team.avgGoalsFor) * 0.15)
  const defenseScore = Math.round(normalizeDefense(team.avgGoalsAgainst) * 0.15)
  const historyScore = Math.round(calculateWorldCupHistory(team) * 0.1)
  const injuryAdjustment = (team.injuryScore ?? 0) * 0.05

  const baseScore = Math.round(
    eloScore +
      recentFormScore +
      attackScore +
      defenseScore +
      historyScore +
      injuryAdjustment
  )

  return {
    baseScore,
    components: {
      eloScore,
      recentFormScore,
      attackScore,
      defenseScore,
      historyScore,
    },
  }
}
