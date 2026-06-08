"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { TeamFlag } from "@/components/team-flag"
import { Search, Trophy } from "lucide-react"

interface Team {
  id: string
  name: string
  fifaCode: string
  country: string
  fifaRanking: number
  eloRating: number
  worldCupTitles: number
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/teams")
      .then((r) => r.json())
      .then((res) => setTeams(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = teams.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.fifaCode.toLowerCase().includes(search.toLowerCase()) ||
      t.country.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">球队数据</h1>
        <p className="text-muted-foreground">各参赛球队的详细数据资料</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="搜索球队名称、代码或国家..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">加载中...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">未找到球队</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((team) => (
            <Link key={team.id} href={`/teams/${team.id}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-1.5 text-base">
                    <TeamFlag fifaCode={team.fifaCode} country={team.country} size={24} />
                    <span className="truncate">{team.name}</span>
                    <Badge variant="outline" className="shrink-0 font-mono">
                      {team.fifaCode}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <div className="text-muted-foreground text-xs">FIFA 排名</div>
                      <div className="font-semibold">{team.fifaRanking}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Elo 评分</div>
                      <div className="font-semibold">{team.eloRating}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">世界杯冠军</div>
                      <div className="font-semibold">{team.worldCupTitles} 次</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
