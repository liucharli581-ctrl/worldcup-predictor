import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiSuccess, apiError } from "@/lib/api-response"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        homeTeam: true,
        awayTeam: true,
        odds: true,
        predictions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    })

    if (!match) return apiError("比赛不存在", 404)
    return apiSuccess(match)
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取比赛详情失败"
    return apiError(message, 500)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const match = await prisma.match.update({
      where: { id },
      data: body,
    })
    return apiSuccess(match)
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新比赛失败"
    return apiError(message, 500)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.match.delete({ where: { id } })
    return apiSuccess({ deleted: true })
  } catch {
    return apiError("删除比赛失败", 500)
  }
}
