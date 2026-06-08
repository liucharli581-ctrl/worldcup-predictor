import type { VirtualSimulationResult } from "./types"

const RULES: Record<string, [number, number]> = {
  low: [0.02, 0.03],
  medium_low: [0.01, 0.02],
  medium: [0.005, 0.01],
  medium_high: [0, 0],
  high: [0, 0],
  extreme: [0, 0],
}

export function calculateVirtualSimulation(
  virtualBankroll: number,
  riskLevel: string
): VirtualSimulationResult {
  const [minRate, maxRate] = RULES[riskLevel] ?? [0, 0]

  let notice: string
  if (minRate > 0) {
    notice = "仅用于虚拟金币模拟，不作为真实下注建议。"
  } else if (riskLevel === "medium_high" || riskLevel === "high") {
    notice = "风险较高，建议跳过此场比赛模拟。"
  } else {
    notice = "风险极高，不参与模拟。"
  }

  return {
    virtualBankroll,
    suggestedMinAmount: Math.round(virtualBankroll * minRate),
    suggestedMaxAmount: Math.round(virtualBankroll * maxRate),
    riskLevel,
    notice,
  }
}
