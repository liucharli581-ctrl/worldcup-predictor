import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: "file:./dev.db" }) })

// Tier-based stat generators
type Tier = "elite" | "strong" | "medium" | "weak" | "minnow"
const tier = (r: number): Tier =>
  r <= 10 ? "elite" : r <= 25 ? "strong" : r <= 45 ? "medium" : r <= 60 ? "weak" : "minnow"

const stats = (r: number, appearances: number) => {
  const t = tier(r)
  const base = {
    elite: { total: 700, winRate: 0.58, drawRate: 0.22, goals: 1.9, against: 0.7, recent5: 4, recent10: 7, elo: 1950 + Math.floor(Math.random() * 120 - 60) },
    strong: { total: 450, winRate: 0.48, drawRate: 0.25, goals: 1.5, against: 1.0, recent5: 3, recent10: 5, elo: 1750 + Math.floor(Math.random() * 100 - 50) },
    medium: { total: 300, winRate: 0.38, drawRate: 0.26, goals: 1.2, against: 1.3, recent5: 2, recent10: 4, elo: 1600 + Math.floor(Math.random() * 80 - 40) },
    weak: { total: 200, winRate: 0.30, drawRate: 0.25, goals: 1.0, against: 1.5, recent5: 2, recent10: 3, elo: 1480 + Math.floor(Math.random() * 60 - 30) },
    minnow: { total: 120, winRate: 0.22, drawRate: 0.22, goals: 0.8, against: 1.8, recent5: 1, recent10: 2, elo: 1350 + Math.floor(Math.random() * 60 - 30) },
  }[t]
  const w = Math.round(base.total * base.winRate)
  const d = Math.round(base.total * base.drawRate)
  const l = base.total - w - d
  return {
    eloRating: base.elo,
    totalMatches: base.total,
    totalWins: w,
    totalDraws: d,
    totalLosses: l,
    goalsFor: Math.round(base.total * base.goals),
    goalsAgainst: Math.round(base.total * base.against),
    recent5Wins: base.recent5,
    recent5Draws: 1,
    recent5Losses: 4 - base.recent5,
    recent10Wins: base.recent10,
    recent10Draws: 2,
    recent10Losses: 8 - base.recent10,
    avgGoalsFor: base.goals,
    avgGoalsAgainst: base.against,
    worldCupAppearances: appearances,
    worldCupTitles: r <= 10 && appearances > 10 ? (r === 1 ? 3 : r === 2 ? 2 : r === 5 ? 5 : 1) : 0,
    bestWorldCupResult: r <= 10 ? "Winner" : r <= 25 ? "Round of 16" : r <= 45 ? "Group Stage" : "Group Stage",
    injuryScore: Math.random() > 0.7 ? -Math.floor(Math.random() * 4 + 1) : 0,
  }
}

// Group definitions
const groups = [
  {
    name: "A", teams: [
      { name: "Mexico", fifaCode: "MEX", ranking: 12, appearances: 17 },
      { name: "South Africa", fifaCode: "RSA", ranking: 54, appearances: 3 },
      { name: "South Korea", fifaCode: "KOR", ranking: 28, appearances: 11 },
      { name: "Czech Republic", fifaCode: "CZE", ranking: 35, appearances: 9 },
    ]
  },
  {
    name: "B", teams: [
      { name: "Canada", fifaCode: "CAN", ranking: 40, appearances: 2 },
      { name: "Bosnia", fifaCode: "BIH", ranking: 55, appearances: 1 },
      { name: "Qatar", fifaCode: "QAT", ranking: 50, appearances: 2 },
      { name: "Switzerland", fifaCode: "SUI", ranking: 19, appearances: 12 },
    ]
  },
  {
    name: "C", teams: [
      { name: "Brazil", fifaCode: "BRA", ranking: 5, appearances: 22 },
      { name: "Morocco", fifaCode: "MAR", ranking: 14, appearances: 7 },
      { name: "Haiti", fifaCode: "HAI", ranking: 85, appearances: 1 },
      { name: "Scotland", fifaCode: "SCO", ranking: 38, appearances: 8 },
    ]
  },
  {
    name: "D", teams: [
      { name: "USA", fifaCode: "USA", ranking: 13, appearances: 11 },
      { name: "Paraguay", fifaCode: "PAR", ranking: 42, appearances: 8 },
      { name: "Australia", fifaCode: "AUS", ranking: 37, appearances: 6 },
      { name: "Turkey", fifaCode: "TUR", ranking: 29, appearances: 2 },
    ]
  },
  {
    name: "E", teams: [
      { name: "Germany", fifaCode: "GER", ranking: 9, appearances: 20 },
      { name: "Curaçao", fifaCode: "CUR", ranking: 80, appearances: 0 },
      { name: "Ivory Coast", fifaCode: "CIV", ranking: 41, appearances: 4 },
      { name: "Ecuador", fifaCode: "ECU", ranking: 31, appearances: 4 },
    ]
  },
  {
    name: "F", teams: [
      { name: "Netherlands", fifaCode: "NED", ranking: 7, appearances: 11 },
      { name: "Japan", fifaCode: "JPN", ranking: 24, appearances: 7 },
      { name: "Sweden", fifaCode: "SWE", ranking: 27, appearances: 12 },
      { name: "Tunisia", fifaCode: "TUN", ranking: 32, appearances: 6 },
    ]
  },
  {
    name: "G", teams: [
      { name: "Belgium", fifaCode: "BEL", ranking: 6, appearances: 14 },
      { name: "Egypt", fifaCode: "EGY", ranking: 34, appearances: 3 },
      { name: "Iran", fifaCode: "IRN", ranking: 20, appearances: 6 },
      { name: "New Zealand", fifaCode: "NZL", ranking: 60, appearances: 2 },
    ]
  },
  {
    name: "H", teams: [
      { name: "Spain", fifaCode: "ESP", ranking: 8, appearances: 16 },
      { name: "Cape Verde", fifaCode: "CPV", ranking: 70, appearances: 0 },
      { name: "Saudi Arabia", fifaCode: "KSA", ranking: 52, appearances: 6 },
      { name: "Uruguay", fifaCode: "URU", ranking: 16, appearances: 14 },
    ]
  },
  {
    name: "I", teams: [
      { name: "France", fifaCode: "FRA", ranking: 2, appearances: 16 },
      { name: "Senegal", fifaCode: "SEN", ranking: 22, appearances: 3 },
      { name: "Iraq", fifaCode: "IRQ", ranking: 68, appearances: 1 },
      { name: "Norway", fifaCode: "NOR", ranking: 43, appearances: 3 },
    ]
  },
  {
    name: "J", teams: [
      { name: "Argentina", fifaCode: "ARG", ranking: 1, appearances: 18 },
      { name: "Algeria", fifaCode: "ALG", ranking: 36, appearances: 4 },
      { name: "Austria", fifaCode: "AUT", ranking: 25, appearances: 7 },
      { name: "Jordan", fifaCode: "JOR", ranking: 72, appearances: 0 },
    ]
  },
  {
    name: "K", teams: [
      { name: "Portugal", fifaCode: "POR", ranking: 4, appearances: 8 },
      { name: "DR Congo", fifaCode: "COD", ranking: 65, appearances: 1 },
      { name: "Uzbekistan", fifaCode: "UZB", ranking: 75, appearances: 0 },
      { name: "Colombia", fifaCode: "COL", ranking: 15, appearances: 7 },
    ]
  },
  {
    name: "L", teams: [
      { name: "England", fifaCode: "ENG", ranking: 3, appearances: 16 },
      { name: "Croatia", fifaCode: "CRO", ranking: 10, appearances: 6 },
      { name: "Ghana", fifaCode: "GHA", ranking: 46, appearances: 4 },
      { name: "Panama", fifaCode: "PAN", ranking: 63, appearances: 1 },
    ]
  },
]

// Matchday 1 fixtures (in Beijing time, converted to UTC)
const matches = [
  // Group A - Jun 12
  { group: "A", home: "Mexico", away: "South Africa", date: "2026-06-11T19:00:00Z" },
  { group: "A", home: "South Korea", away: "Czech Republic", date: "2026-06-12T02:00:00Z" },
  // Group B - Jun 13-14
  { group: "B", home: "Canada", away: "Bosnia", date: "2026-06-12T19:00:00Z" },
  { group: "B", home: "Qatar", away: "Switzerland", date: "2026-06-13T19:00:00Z" },
  // Group C - Jun 14
  { group: "C", home: "Brazil", away: "Morocco", date: "2026-06-13T22:00:00Z" },
  { group: "C", home: "Haiti", away: "Scotland", date: "2026-06-14T01:00:00Z" },
  // Group D - Jun 13-14
  { group: "D", home: "USA", away: "Paraguay", date: "2026-06-13T01:00:00Z" },
  { group: "D", home: "Australia", away: "Turkey", date: "2026-06-14T04:00:00Z" },
  // Group E - Jun 15
  { group: "E", home: "Germany", away: "Curaçao", date: "2026-06-14T17:00:00Z" },
  { group: "E", home: "Ivory Coast", away: "Ecuador", date: "2026-06-14T23:00:00Z" },
  // Group F - Jun 15
  { group: "F", home: "Netherlands", away: "Japan", date: "2026-06-14T20:00:00Z" },
  { group: "F", home: "Sweden", away: "Tunisia", date: "2026-06-15T02:00:00Z" },
  // Group G - Jun 16
  { group: "G", home: "Belgium", away: "Egypt", date: "2026-06-15T19:00:00Z" },
  { group: "G", home: "Iran", away: "New Zealand", date: "2026-06-16T01:00:00Z" },
  // Group H - Jun 16
  { group: "H", home: "Spain", away: "Cape Verde", date: "2026-06-15T16:00:00Z" },
  { group: "H", home: "Saudi Arabia", away: "Uruguay", date: "2026-06-15T22:00:00Z" },
  // Group I - Jun 17 (Mbappé)
  { group: "I", home: "France", away: "Senegal", date: "2026-06-16T19:00:00Z" },
  { group: "I", home: "Iraq", away: "Norway", date: "2026-06-16T22:00:00Z" },
  // Group J - Jun 17 (Messi)
  { group: "J", home: "Argentina", away: "Algeria", date: "2026-06-17T01:00:00Z" },
  { group: "J", home: "Austria", away: "Jordan", date: "2026-06-17T04:00:00Z" },
  // Group K - Jun 18 (Cristiano)
  { group: "K", home: "Portugal", away: "DR Congo", date: "2026-06-17T17:00:00Z" },
  { group: "K", home: "Uzbekistan", away: "Colombia", date: "2026-06-18T02:00:00Z" },
  // Group L - Jun 18
  { group: "L", home: "England", away: "Croatia", date: "2026-06-17T20:00:00Z" },
  { group: "L", home: "Ghana", away: "Panama", date: "2026-06-17T23:00:00Z" },
]

async function main() {
  console.log("🌱 清除旧数据...")
  await prisma.modelReview.deleteMany()
  await prisma.virtualSimulation.deleteMany()
  await prisma.prediction.deleteMany()
  await prisma.oddsRecord.deleteMany()
  await prisma.match.deleteMany()
  await prisma.team.deleteMany()

  console.log("🏃 创建 48 支球队...")
  const teamMap = new Map<string, string>()

  for (const g of groups) {
    for (const t of g.teams) {
      const s = stats(t.ranking, t.appearances)
      const team = await prisma.team.create({
        data: {
          name: t.name,
          fifaCode: t.fifaCode,
          country: t.name,
          fifaRanking: t.ranking,
          groupName: g.name,
          ...s,
        },
      })
      teamMap.set(t.name, team.id)
    }
  }
  console.log(`✅ ${teamMap.size} 支球队创建完成`)

  console.log("🏟️ 创建小组赛...")
  let matchCount = 0
  const matchIds = new Map<string, string>()

  for (const m of matches) {
    const match = await prisma.match.create({
      data: {
        competition: "World Cup 2026",
        matchStage: `Group ${m.group}`,
        matchDate: new Date(m.date),
        homeTeamId: teamMap.get(m.home)!,
        awayTeamId: teamMap.get(m.away)!,
        neutralGround: true,
        status: "scheduled",
      },
    })
    matchIds.set(`${m.group}:${m.home}vs${m.away}`, match.id)
    matchCount++
  }
  console.log(`✅ ${matchCount} 场比赛创建完成`)

  console.log("📊 创建赔率数据...")
  let oddsCount = 0

  async function seedOdds(matchKey: string, records: Array<Record<string, unknown>>) {
    const matchId = matchIds.get(matchKey)
    if (!matchId) return
    for (const r of records) {
      await prisma.oddsRecord.create({ data: { matchId, ...r } as never })
      oddsCount++
    }
  }

  // Premium matches with full odds
  await seedOdds("A:MexicovsSouth Africa", [
    { bookmaker: "Bet365", initialHomeWin: 1.55, initialDraw: 3.8, initialAwayWin: 6.0, currentHomeWin: 1.5, currentDraw: 3.9, currentAwayWin: 6.5, homeChange: -0.05, drawChange: 0.1, awayChange: 0.5, homeChangeRate: -0.0323, drawChangeRate: 0.0263, awayChangeRate: 0.0833, isMajorBookmaker: true, isAbnormal: false },
    { bookmaker: "William Hill", initialHomeWin: 1.53, initialDraw: 3.75, initialAwayWin: 6.5, currentHomeWin: 1.5, currentDraw: 3.8, currentAwayWin: 6.5, homeChange: -0.03, drawChange: 0.05, awayChange: 0.0, homeChangeRate: -0.0196, drawChangeRate: 0.0133, awayChangeRate: 0.0, isMajorBookmaker: true, isAbnormal: false },
  ])
  await seedOdds("C:BrazilvsMorocco", [
    { bookmaker: "Bet365", initialHomeWin: 1.7, initialDraw: 3.5, initialAwayWin: 4.8, currentHomeWin: 1.65, currentDraw: 3.6, currentAwayWin: 5.0, homeChange: -0.05, drawChange: 0.1, awayChange: 0.2, homeChangeRate: -0.0294, drawChangeRate: 0.0286, awayChangeRate: 0.0417, isMajorBookmaker: true, isAbnormal: false },
    { bookmaker: "William Hill", initialHomeWin: 1.72, initialDraw: 3.4, initialAwayWin: 5.0, currentHomeWin: 1.67, currentDraw: 3.5, currentAwayWin: 5.2, homeChange: -0.05, drawChange: 0.1, awayChange: 0.2, homeChangeRate: -0.0291, drawChangeRate: 0.0294, awayChangeRate: 0.04, isMajorBookmaker: true, isAbnormal: false },
    { bookmaker: "Pinnacle", initialHomeWin: 1.74, initialDraw: 3.45, initialAwayWin: 4.9, currentHomeWin: 1.68, currentDraw: 3.55, currentAwayWin: 5.1, homeChange: -0.06, drawChange: 0.1, awayChange: 0.2, homeChangeRate: -0.0345, drawChangeRate: 0.029, awayChangeRate: 0.0408, isMajorBookmaker: true, isAbnormal: false },
  ])
  await seedOdds("D:USAvsParaguay", [
    { bookmaker: "Bet365", initialHomeWin: 1.6, initialDraw: 3.7, initialAwayWin: 5.5, currentHomeWin: 1.57, currentDraw: 3.75, currentAwayWin: 5.8, homeChange: -0.03, drawChange: 0.05, awayChange: 0.3, homeChangeRate: -0.0188, drawChangeRate: 0.0135, awayChangeRate: 0.0545, isMajorBookmaker: true, isAbnormal: false },
  ])
  await seedOdds("F:NetherlandsvsJapan", [
    { bookmaker: "Bet365", initialHomeWin: 1.45, initialDraw: 4.0, initialAwayWin: 7.0, currentHomeWin: 1.42, currentDraw: 4.1, currentAwayWin: 7.5, homeChange: -0.03, drawChange: 0.1, awayChange: 0.5, homeChangeRate: -0.0207, drawChangeRate: 0.025, awayChangeRate: 0.0714, isMajorBookmaker: true, isAbnormal: false },
    { bookmaker: "William Hill", initialHomeWin: 1.44, initialDraw: 4.0, initialAwayWin: 7.5, currentHomeWin: 1.4, currentDraw: 4.2, currentAwayWin: 7.5, homeChange: -0.04, drawChange: 0.2, awayChange: 0.0, homeChangeRate: -0.0278, drawChangeRate: 0.05, awayChangeRate: 0.0, isMajorBookmaker: true, isAbnormal: false },
  ])
  await seedOdds("I:FrancevsSenegal", [
    { bookmaker: "Bet365", initialHomeWin: 1.3, initialDraw: 4.8, initialAwayWin: 9.0, currentHomeWin: 1.28, currentDraw: 5.0, currentAwayWin: 9.5, homeChange: -0.02, drawChange: 0.2, awayChange: 0.5, homeChangeRate: -0.0154, drawChangeRate: 0.0417, awayChangeRate: 0.0556, isMajorBookmaker: true, isAbnormal: false },
    { bookmaker: "Pinnacle", initialHomeWin: 1.32, initialDraw: 4.7, initialAwayWin: 9.5, currentHomeWin: 1.28, currentDraw: 4.9, currentAwayWin: 10.0, homeChange: -0.04, drawChange: 0.2, awayChange: 0.5, homeChangeRate: -0.0303, drawChangeRate: 0.0426, awayChangeRate: 0.0526, isMajorBookmaker: true, isAbnormal: false },
  ])
  await seedOdds("J:ArgentinavsAlgeria", [
    { bookmaker: "Bet365", initialHomeWin: 1.2, initialDraw: 5.5, initialAwayWin: 12.0, currentHomeWin: 1.18, currentDraw: 5.8, currentAwayWin: 13.0, homeChange: -0.02, drawChange: 0.3, awayChange: 1.0, homeChangeRate: -0.0167, drawChangeRate: 0.0545, awayChangeRate: 0.0833, isMajorBookmaker: true, isAbnormal: false },
    { bookmaker: "William Hill", initialHomeWin: 1.22, initialDraw: 5.2, initialAwayWin: 13.0, currentHomeWin: 1.18, currentDraw: 5.5, currentAwayWin: 14.0, homeChange: -0.04, drawChange: 0.3, awayChange: 1.0, homeChangeRate: -0.0328, drawChangeRate: 0.0577, awayChangeRate: 0.0769, isMajorBookmaker: true, isAbnormal: false },
    { bookmaker: "Bwin", initialHomeWin: 1.2, initialDraw: 5.5, initialAwayWin: 12.0, currentHomeWin: 1.18, currentDraw: 5.6, currentAwayWin: 13.0, homeChange: -0.02, drawChange: 0.1, awayChange: 1.0, homeChangeRate: -0.0167, drawChangeRate: 0.0182, awayChangeRate: 0.0833, isMajorBookmaker: true, isAbnormal: false },
  ])
  await seedOdds("K:PortugalvsDR Congo", [
    { bookmaker: "Bet365", initialHomeWin: 1.25, initialDraw: 5.0, initialAwayWin: 11.0, currentHomeWin: 1.22, currentDraw: 5.25, currentAwayWin: 12.0, homeChange: -0.03, drawChange: 0.25, awayChange: 1.0, homeChangeRate: -0.024, drawChangeRate: 0.05, awayChangeRate: 0.0909, isMajorBookmaker: true, isAbnormal: false },
  ])
  await seedOdds("L:EnglandvsCroatia", [
    { bookmaker: "Bet365", initialHomeWin: 1.6, initialDraw: 3.6, initialAwayWin: 5.5, currentHomeWin: 1.57, currentDraw: 3.7, currentAwayWin: 5.8, homeChange: -0.03, drawChange: 0.1, awayChange: 0.3, homeChangeRate: -0.0188, drawChangeRate: 0.0278, awayChangeRate: 0.0545, isMajorBookmaker: true, isAbnormal: false },
    { bookmaker: "William Hill", initialHomeWin: 1.62, initialDraw: 3.5, initialAwayWin: 5.8, currentHomeWin: 1.58, currentDraw: 3.6, currentAwayWin: 6.0, homeChange: -0.04, drawChange: 0.1, awayChange: 0.2, homeChangeRate: -0.0247, drawChangeRate: 0.0286, awayChangeRate: 0.0345, isMajorBookmaker: true, isAbnormal: false },
    { bookmaker: "Pinnacle", initialHomeWin: 1.64, initialDraw: 3.55, initialAwayWin: 5.6, currentHomeWin: 1.6, currentDraw: 3.6, currentAwayWin: 5.8, homeChange: -0.04, drawChange: 0.05, awayChange: 0.2, homeChangeRate: -0.0244, drawChangeRate: 0.0141, awayChangeRate: 0.0357, isMajorBookmaker: true, isAbnormal: false },
  ])
  // Standard odds for remaining matches
  for (const [key] of matchIds) {
    if (key.includes("Mexico") || key.includes("Brazil") || key.includes("USA") || key.includes("Netherlands") || key.includes("France") || key.includes("Argentina") || key.includes("Portugal") || key.includes("England")) continue
    await seedOdds(key, [
      { bookmaker: "Bet365", initialHomeWin: 2.1, initialDraw: 3.2, initialAwayWin: 3.4, currentHomeWin: 2.0, currentDraw: 3.3, currentAwayWin: 3.6, homeChange: -0.1, drawChange: 0.1, awayChange: 0.2, homeChangeRate: -0.0476, drawChangeRate: 0.0313, awayChangeRate: 0.0588, isMajorBookmaker: true, isAbnormal: false },
      { bookmaker: "William Hill", initialHomeWin: 2.05, initialDraw: 3.2, initialAwayWin: 3.5, currentHomeWin: 2.0, currentDraw: 3.25, currentAwayWin: 3.6, homeChange: -0.05, drawChange: 0.05, awayChange: 0.1, homeChangeRate: -0.0244, drawChangeRate: 0.0156, awayChangeRate: 0.0286, isMajorBookmaker: true, isAbnormal: false },
    ])
  }

  console.log(`✅ ${oddsCount} 条赔率数据创建完成`)
  console.log("🎉 数据播种完成!")
  await prisma.$disconnect()
}

main().catch((e: unknown) => {
  console.error("❌ 播种失败:", e)
  process.exit(1)
})
