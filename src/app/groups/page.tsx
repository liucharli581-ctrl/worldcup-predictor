"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Users, ChevronRight } from "lucide-react"
import { TeamFlag } from "@/components/team-flag"

interface GroupTeam {
  id: string
  name: string
  fifaCode: string
  country: string | null
  fifaRanking: number
  eloRating: number
  worldCupTitles: number
}

interface GroupData {
  name: string
  teams: GroupTeam[]
}

const GROUP_NAMES: Record<string, string> = {
  A: "A组", B: "B组", C: "C组", D: "D组",
  E: "E组", F: "F组", G: "G组", H: "H组",
  I: "I组", J: "J组", K: "K组", L: "L组",
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((res) => setGroups(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const rankingColor = (r: number) => {
    if (r <= 10) return "text-green-600 font-semibold"
    if (r <= 25) return "text-blue-600"
    if (r <= 45) return "text-yellow-600"
    return "text-muted-foreground"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">世界杯分组</h1>
        <p className="text-muted-foreground">2026 年世界杯 12 个小组一览</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((g) => (
          <Link key={g.name} href={`/groups/${g.name}`} className="block transition-all hover:scale-[1.02]">
            <Card className="h-full overflow-hidden border-l-4 border-l-amber-500">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    {GROUP_NAMES[g.name] ?? `${g.name}组`}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {g.teams.map((t, i) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <div>
                        <span className="flex items-center gap-1 text-sm font-medium">
                          <TeamFlag fifaCode={t.fifaCode} country={t.country} size={20} />
                          {t.name}
                        </span>
                        <Badge variant="outline" className="ml-1.5 text-[10px] font-mono">
                          {t.fifaCode}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {t.worldCupTitles > 0 && (
                        <span className="flex items-center gap-0.5 text-amber-600" title="世界杯冠军">
                          <Trophy className="h-3 w-3" />
                          {t.worldCupTitles}
                        </span>
                      )}
                      <span className={rankingColor(t.fifaRanking)}>
                        FIFA {t.fifaRanking}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
