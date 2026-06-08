import type { OddsRecord } from "@/generated/prisma"
import type { OddsChange } from "./types"

export function calculateOddsChange(record: {
  initialHomeWin: number
  initialDraw: number
  initialAwayWin: number
  currentHomeWin: number
  currentDraw: number
  currentAwayWin: number
}): OddsChange {
  return {
    homeChange: +(record.currentHomeWin - record.initialHomeWin).toFixed(4),
    drawChange: +(record.currentDraw - record.initialDraw).toFixed(4),
    awayChange: +(record.currentAwayWin - record.initialAwayWin).toFixed(4),
    homeChangeRate: +(
      (record.currentHomeWin - record.initialHomeWin) /
      record.initialHomeWin
    ).toFixed(4),
    drawChangeRate: +(
      (record.currentDraw - record.initialDraw) /
      record.initialDraw
    ).toFixed(4),
    awayChangeRate: +(
      (record.currentAwayWin - record.initialAwayWin) /
      record.initialAwayWin
    ).toFixed(4),
  }
}

export function isAbnormalMovement(
  record: OddsRecord & OddsChange
): boolean {
  return (
    Math.abs(record.homeChangeRate) > 0.1 ||
    Math.abs(record.drawChangeRate) > 0.1 ||
    Math.abs(record.awayChangeRate) > 0.1
  )
}
