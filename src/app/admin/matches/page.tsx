"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, Search } from "lucide-react"

interface Team {
  id: string
  name: string
  fifaCode: string | null
}

interface MatchItem {
  id: string
  competition: string | null
  matchStage: string | null
  matchDate: string
  homeTeamId: string
  awayTeamId: string
  neutralGround: boolean
  status: string
  actualHomeScore: number | null
  actualAwayScore: number | null
  actualResult: string | null
  homeTeam: Team
  awayTeam: Team
}

const emptyForm = {
  competition: "",
  matchStage: "",
  matchDate: "",
  homeTeamId: "",
  awayTeamId: "",
  neutralGround: false,
  status: "scheduled",
  actualHomeScore: "",
  actualAwayScore: "",
}

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<MatchItem[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTeam, setSearchTeam] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchMatches = () => {
    setLoading(true)
    const url = searchTeam
      ? `/api/matches?team=${encodeURIComponent(searchTeam)}`
      : "/api/matches"
    fetch(url)
      .then((r) => r.json())
      .then((res) => setMatches(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/matches").then((r) => r.json()),
      fetch("/api/teams").then((r) => r.json()),
    ])
      .then(([matchRes, teamsRes]) => {
        setMatches(matchRes.data ?? [])
        setTeams(teamsRes.data ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (match: MatchItem) => {
    setEditingId(match.id)
    setForm({
      competition: match.competition ?? "",
      matchStage: match.matchStage ?? "",
      matchDate: new Date(match.matchDate).toISOString().slice(0, 16),
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      neutralGround: match.neutralGround,
      status: match.status,
      actualHomeScore: match.actualHomeScore?.toString() ?? "",
      actualAwayScore: match.actualAwayScore?.toString() ?? "",
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        competition: form.competition || null,
        matchStage: form.matchStage || null,
        matchDate: form.matchDate,
        homeTeamId: form.homeTeamId,
        awayTeamId: form.awayTeamId,
        neutralGround: form.neutralGround,
        status: form.status,
      }

      if (form.status === "completed") {
        const homeScore = Number(form.actualHomeScore)
        const awayScore = Number(form.actualAwayScore)
        body.actualHomeScore = homeScore
        body.actualAwayScore = awayScore
        body.actualResult =
          homeScore > awayScore ? "home_win" : homeScore < awayScore ? "away_win" : "draw"
      }

      if (editingId) {
        await fetch(`/api/matches/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      } else {
        await fetch("/api/matches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      }
      setDialogOpen(false)
      fetchMatches()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除该比赛吗？")) return
    try {
      await fetch(`/api/matches/${id}`, { method: "DELETE" })
      fetchMatches()
    } catch {
      // ignore
    }
  }

  const statusBadge = (status: string) => {
    if (status === "completed") return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400">已结束</Badge>
    if (status === "live") return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400">进行中</Badge>
    return <Badge variant="secondary">未开始</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">比赛管理</h1>
          <p className="text-sm text-muted-foreground">共 {matches.length} 场比赛</p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-1">
          <Plus className="h-4 w-4" />
          添加比赛
        </Button>
      </div>

      {/* 搜索 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="按球队搜索..."
            value={searchTeam}
            onChange={(e) => setSearchTeam(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchMatches()}
            className="pl-8"
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchMatches}>搜索</Button>
      </div>

      {/* 比赛列表 */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">加载中...</p>
          ) : matches.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">暂无比赛数据</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">日期</th>
                    <th className="px-4 py-3 font-medium">赛事</th>
                    <th className="px-4 py-3 font-medium">阶段</th>
                    <th className="px-4 py-3 font-medium">主队</th>
                    <th className="px-4 py-3 font-medium text-center">比分</th>
                    <th className="px-4 py-3 font-medium">客队</th>
                    <th className="px-4 py-3 font-medium">状态</th>
                    <th className="px-4 py-3 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m) => (
                    <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {new Date(m.matchDate).toLocaleDateString("zh-CN")}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{m.competition ?? "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.matchStage ?? "-"}</td>
                      <td className="px-4 py-3 font-medium">{m.homeTeam.name}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold tabular-nums">
                        {m.status === "completed" && m.actualHomeScore != null
                          ? `${m.actualHomeScore} : ${m.actualAwayScore}`
                          : "-"}
                      </td>
                      <td className="px-4 py-3 font-medium">{m.awayTeam.name}</td>
                      <td className="px-4 py-3">{statusBadge(m.status)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 创建/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑比赛" : "添加比赛"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>赛事</Label>
                <Input value={form.competition} onChange={(e) => setForm({ ...form, competition: e.target.value })} placeholder="如: World Cup 2026" />
              </div>
              <div className="grid gap-2">
                <Label>阶段</Label>
                <Input value={form.matchStage} onChange={(e) => setForm({ ...form, matchStage: e.target.value })} placeholder="如: Group Stage" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>比赛时间 *</Label>
              <Input type="datetime-local" value={form.matchDate} onChange={(e) => setForm({ ...form, matchDate: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>主队 *</Label>
                <Select value={form.homeTeamId} onValueChange={(v) => setForm({ ...form, homeTeamId: v ?? "" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择主队" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name} {t.fifaCode ? `(${t.fifaCode})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>客队 *</Label>
                <Select value={form.awayTeamId} onValueChange={(v) => setForm({ ...form, awayTeamId: v ?? "" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择客队" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name} {t.fifaCode ? `(${t.fifaCode})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>状态</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v ?? "scheduled" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">未开始</SelectItem>
                  <SelectItem value="live">进行中</SelectItem>
                  <SelectItem value="completed">已结束</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.status === "completed" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>主队进球</Label>
                  <Input type="number" min="0" value={form.actualHomeScore} onChange={(e) => setForm({ ...form, actualHomeScore: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>客队进球</Label>
                  <Input type="number" min="0" value={form.actualAwayScore} onChange={(e) => setForm({ ...form, actualAwayScore: e.target.value })} />
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving || !form.matchDate || !form.homeTeamId || !form.awayTeamId}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
