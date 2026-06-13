import { NextResponse } from "next/server"
import { generateAllPredictions } from "@/lib/data-fetcher/sync"

export async function GET() {
  const start = Date.now()

  try {
    const result = await generateAllPredictions()
    return NextResponse.json({
      success: true,
      duration: `${Date.now() - start}ms`,
      generated: result.generated,
    })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
