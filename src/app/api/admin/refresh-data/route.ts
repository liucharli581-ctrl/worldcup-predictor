import { NextResponse } from "next/server"
import { syncOddsData, syncResults, generateAllPredictions } from "@/lib/data-fetcher/sync"

export async function POST() {
  const start = Date.now()
  const results: Record<string, unknown> = {}

  try {
    const oddsResult = await syncOddsData()
    results.odds = oddsResult
  } catch (e) {
    results.odds = { error: e instanceof Error ? e.message : String(e) }
  }

  try {
    const resultResult = await syncResults()
    results.results = resultResult
  } catch (e) {
    results.results = { error: e instanceof Error ? e.message : String(e) }
  }

  try {
    const predResult = await generateAllPredictions()
    results.predictions = predResult
  } catch (e) {
    results.predictions = { error: e instanceof Error ? e.message : String(e) }
  }

  return NextResponse.json({
    success: true,
    duration: `${Date.now() - start}ms`,
    results,
  })
}
