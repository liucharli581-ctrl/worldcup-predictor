import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiSuccess, apiError } from "@/lib/api-response"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const team = await prisma.team.findUnique({ where: { id } })
    if (!team) return apiError("球队不存在", 404)
    return apiSuccess(team)
  } catch {
    return apiError("获取球队失败", 500)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const team = await prisma.team.update({
      where: { id },
      data: body,
    })
    return apiSuccess(team)
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新球队失败"
    return apiError(message, 500)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.team.delete({ where: { id } })
    return apiSuccess({ deleted: true })
  } catch {
    return apiError("删除球队失败", 500)
  }
}
