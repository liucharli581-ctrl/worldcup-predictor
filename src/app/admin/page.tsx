import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Swords } from "lucide-react"

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">管理后台</h1>
        <p className="text-sm text-muted-foreground">管理球队、比赛等基础数据</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/teams">
          <Card className="transition-colors hover:border-amber-300 hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-amber-500" />
                球队管理
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">添加、编辑、删除参赛球队信息</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/matches">
          <Card className="transition-colors hover:border-amber-300 hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Swords className="h-4 w-4 text-amber-500" />
                比赛管理
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">管理赛程、录入比分、设置比赛状态</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
