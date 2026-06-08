"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, Search } from "lucide-react"

interface Team {
  id: string
  name: string
  fifaCode: string | null
  country: string | null
  fifaRanking: number | null
  eloRating: number | null
  groupName: string | null
}

const emptyForm = {
  name: "",
  fifaCode: "",
  country: "",
  fifaRanking: "",
  eloRating: "",
  groupName: "",
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchTeams = () => {
    setLoading(true)
    const url = search ? `/api/teams?search=${encodeURIComponent(search)}` : "/api/teams"
    fetch(url)
      .then((r) => r.json())
      .then((res) => setTeams(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchTeams() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (team: Team) => {
    setEditingId(team.id)
    setForm({
      name: team.name,
      fifaCode: team.fifaCode ?? "",
      country: team.country ?? "",
      fifaRanking: team.fifaRanking?.toString() ?? "",
      eloRating: team.eloRating?.toString() ?? "",
      groupName: team.groupName ?? "",
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        name: form.name,
        fifaCode: form.fifaCode || null,
        country: form.country || null,
        fifaRanking: form.fifaRanking ? Number(form.fifaRanking) : null,
        eloRating: form.eloRating ? Number(form.eloRating) : null,
        groupName: form.groupName || null,
      }

      if (editingId) {
        await fetch(`/api/teams/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      } else {
        await fetch("/api/teams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      }
      setDialogOpen(false)
      fetchTeams()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除球队「${name}」吗？`)) return
    try {
      await fetch(`/api/teams/${id}`, { method: "DELETE" })
      fetchTeams()
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">球队管理</h1>
          <p className="text-sm text-muted-foreground">共 {teams.length} 支球队</p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-1">
          <Plus className="h-4 w-4" />
          添加球队
        </Button>
      </div>

      {/* 搜索 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索球队..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchTeams()}
            className="pl-8"
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchTeams}>搜索</Button>
      </div>

      {/* 球队列表 */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">加载中...</p>
          ) : teams.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">暂无球队数据</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">名称</th>
                    <th className="px-4 py-3 font-medium">FIFA 代码</th>
                    <th className="px-4 py-3 font-medium">国家/地区</th>
                    <th className="px-4 py-3 font-medium">FIFA 排名</th>
                    <th className="px-4 py-3 font-medium">ELO 评分</th>
                    <th className="px-4 py-3 font-medium">小组</th>
                    <th className="px-4 py-3 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team) => (
                    <tr key={team.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{team.name}</td>
                      <td className="px-4 py-3">
                        {team.fifaCode ? <Badge variant="outline">{team.fifaCode}</Badge> : "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{team.country ?? "-"}</td>
                      <td className="px-4 py-3 font-mono">{team.fifaRanking ?? "-"}</td>
                      <td className="px-4 py-3 font-mono">{team.eloRating ?? "-"}</td>
                      <td className="px-4 py-3">{team.groupName ?? "-"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(team)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(team.id, team.name)}>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑球队" : "添加球队"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>球队名称 *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如: Brazil" />
            </div>
            <div className="grid gap-2">
              <Label>FIFA 代码</Label>
              <Input value={form.fifaCode} onChange={(e) => setForm({ ...form, fifaCode: e.target.value })} placeholder="如: BRA" maxLength={3} />
            </div>
            <div className="grid gap-2">
              <Label>国家/地区</Label>
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="如: 巴西" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>FIFA 排名</Label>
                <Input type="number" value={form.fifaRanking} onChange={(e) => setForm({ ...form, fifaRanking: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>ELO 评分</Label>
                <Input type="number" step="0.1" value={form.eloRating} onChange={(e) => setForm({ ...form, eloRating: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>小组</Label>
              <Input value={form.groupName} onChange={(e) => setForm({ ...form, groupName: e.target.value })} placeholder="如: Group A" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
