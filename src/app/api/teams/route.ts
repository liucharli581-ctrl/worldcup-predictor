import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiSuccess, apiError } from "@/lib/api-response"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")

    const where = search
      ? { name: { contains: search } }
      : {}

    const teams = await prisma.team.findMany({
      where,
      orderBy: { name: "asc" },
    })
    return apiSuccess(teams)
  } catch {
    return apiError("获取球队列表失败", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const team = await prisma.team.create({ data: body })
    return apiSuccess(team, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建球队失败"
    return apiError(message, 500)
  }
}
