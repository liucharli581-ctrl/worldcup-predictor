"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft } from "lucide-react"

export default function ReviewPage() {
  const params = useParams()
  const router = useRouter()
  const [match, setMatch] = useState<{ homeTeam: { name: string }; awayTeam: { name: string } } | null>(null)
  const [homeScore, setHomeScore] = useState("")
  const [awayScore, setAwayScore] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/matches/${params.id}`)
      .then((r) => r.json())
      .then((res) => setMatch(res.data ?? null))
      .catch(() => {})
  }, [params.id])

  const handleSubmit = async () => {
    if (!homeScore || !awayScore) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/matches/${params.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualHomeScore: Number(homeScore),
          actualAwayScore: Number(awayScore),
        }),
      })
      const data = await res.json()
      if (data.success) {
        router.push(`/matches/${params.id}`)
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <Link href={`/matches/${params.id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        返回比赛详情
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">创建复盘</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {match && (
            <div className="text-center text-sm font-medium">
              {match.homeTeam.name} vs {match.awayTeam.name}
            </div>
          )}

          <div className="flex items-center justify-center gap-4">
            <div className="w-24 text-right text-sm font-medium">
              {match?.homeTeam.name ?? "主队"}
            </div>
            <Input
              type="number"
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              className="w-20 text-center text-lg font-bold"
              placeholder="0"
            />
            <span className="text-lg font-bold">:</span>
            <Input
              type="number"
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              className="w-20 text-center text-lg font-bold"
              placeholder="0"
            />
            <div className="w-24 text-sm font-medium">
              {match?.awayTeam.name ?? "客队"}
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || !homeScore || !awayScore}
            className="w-full"
          >
            {submitting ? "提交中..." : "提交复盘"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
