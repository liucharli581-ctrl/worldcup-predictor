import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client"

const connectionString = process.env.DATABASE_URL!
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

const HISTORICAL_MATCHES = [
  ["RUS", "KSA", "2018-06-14", "World Cup 2018", "Group Stage", 5, 0],
  ["EGY", "URU", "2018-06-15", "World Cup 2018", "Group Stage", 0, 1],
  ["MAR", "IRN", "2018-06-15", "World Cup 2018", "Group Stage", 0, 1],
  ["POR", "ESP", "2018-06-15", "World Cup 2018", "Group Stage", 3, 3],
  ["FRA", "AUS", "2018-06-16", "World Cup 2018", "Group Stage", 2, 1],
  ["ARG", "ISL", "2018-06-16", "World Cup 2018", "Group Stage", 1, 1],
  ["GER", "MEX", "2018-06-17", "World Cup 2018", "Group Stage", 0, 1],
  ["BRA", "SUI", "2018-06-17", "World Cup 2018", "Group Stage", 1, 1],
  ["CRC", "SRB", "2018-06-17", "World Cup 2018", "Group Stage", 0, 1],
  ["SWE", "KOR", "2018-06-18", "World Cup 2018", "Group Stage", 1, 0],
  ["BEL", "PAN", "2018-06-18", "World Cup 2018", "Group Stage", 3, 0],
  ["TUN", "ENG", "2018-06-18", "World Cup 2018", "Group Stage", 1, 2],
  ["COL", "JPN", "2018-06-19", "World Cup 2018", "Group Stage", 1, 2],
  ["URU", "KSA", "2018-06-20", "World Cup 2018", "Group Stage", 1, 0],
  ["POR", "MAR", "2018-06-20", "World Cup 2018", "Group Stage", 1, 0],
  ["FRA", "PER", "2018-06-21", "World Cup 2018", "Group Stage", 1, 0],
  ["ARG", "CRO", "2018-06-21", "World Cup 2018", "Group Stage", 0, 3],
  ["BRA", "CRC", "2018-06-22", "World Cup 2018", "Group Stage", 2, 0],
  ["GER", "SWE", "2018-06-23", "World Cup 2018", "Group Stage", 2, 1],
  ["ENG", "PAN", "2018-06-24", "World Cup 2018", "Group Stage", 6, 1],
  ["JPN", "SEN", "2018-06-24", "World Cup 2018", "Group Stage", 2, 2],
  ["ESP", "MAR", "2018-06-25", "World Cup 2018", "Group Stage", 2, 2],
  ["FRA", "ARG", "2018-06-30", "World Cup 2018", "Round of 16", 4, 3],
  ["URU", "POR", "2018-06-30", "World Cup 2018", "Round of 16", 2, 1],
  ["RUS", "ESP", "2018-07-01", "World Cup 2018", "Round of 16", 1, 1],
  ["CRO", "DEN", "2018-07-01", "World Cup 2018", "Round of 16", 1, 1],
  ["BEL", "JPN", "2018-07-02", "World Cup 2018", "Round of 16", 3, 2],
  ["SWE", "SUI", "2018-07-03", "World Cup 2018", "Round of 16", 1, 0],
  ["FRA", "URU", "2018-07-06", "World Cup 2018", "Quarter-finals", 2, 0],
  ["BEL", "BRA", "2018-07-06", "World Cup 2018", "Quarter-finals", 2, 1],
  ["CRO", "RUS", "2018-07-07", "World Cup 2018", "Quarter-finals", 2, 2],
  ["FRA", "BEL", "2018-07-10", "World Cup 2018", "Semi-finals", 1, 0],
  ["CRO", "ENG", "2018-07-11", "World Cup 2018", "Semi-finals", 2, 1],
  ["FRA", "CRO", "2018-07-15", "World Cup 2018", "Final", 4, 2],
  ["QAT", "ECU", "2022-11-20", "World Cup 2022", "Group Stage", 0, 2],
  ["ENG", "IRN", "2022-11-21", "World Cup 2022", "Group Stage", 6, 2],
  ["SEN", "NED", "2022-11-21", "World Cup 2022", "Group Stage", 0, 2],
  ["ARG", "KSA", "2022-11-22", "World Cup 2022", "Group Stage", 1, 2],
  ["DEN", "TUN", "2022-11-22", "World Cup 2022", "Group Stage", 0, 0],
  ["MEX", "POL", "2022-11-22", "World Cup 2022", "Group Stage", 0, 0],
  ["FRA", "AUS", "2022-11-22", "World Cup 2022", "Group Stage", 4, 1],
  ["MAR", "CRO", "2022-11-23", "World Cup 2022", "Group Stage", 0, 0],
  ["GER", "JPN", "2022-11-23", "World Cup 2022", "Group Stage", 1, 2],
  ["ESP", "CRC", "2022-11-23", "World Cup 2022", "Group Stage", 7, 0],
  ["BRA", "SRB", "2022-11-24", "World Cup 2022", "Group Stage", 2, 0],
  ["SUI", "CMR", "2022-11-24", "World Cup 2022", "Group Stage", 1, 0],
  ["POR", "GHA", "2022-11-24", "World Cup 2022", "Group Stage", 3, 2],
  ["NED", "ECU", "2022-11-25", "World Cup 2022", "Group Stage", 1, 1],
  ["ENG", "USA", "2022-11-25", "World Cup 2022", "Group Stage", 0, 0],
  ["ARG", "MEX", "2022-11-26", "World Cup 2022", "Group Stage", 2, 0],
  ["FRA", "DEN", "2022-11-26", "World Cup 2022", "Group Stage", 2, 1],
  ["JPN", "CRC", "2022-11-27", "World Cup 2022", "Group Stage", 0, 1],
  ["BEL", "MAR", "2022-11-27", "World Cup 2022", "Group Stage", 0, 2],
  ["CRO", "CAN", "2022-11-27", "World Cup 2022", "Group Stage", 4, 1],
  ["ESP", "GER", "2022-11-27", "World Cup 2022", "Group Stage", 1, 1],
  ["BRA", "SUI", "2022-11-28", "World Cup 2022", "Group Stage", 1, 0],
  ["POR", "URU", "2022-11-28", "World Cup 2022", "Group Stage", 2, 0],
  ["NED", "QAT", "2022-11-29", "World Cup 2022", "Group Stage", 2, 0],
  ["ECU", "SEN", "2022-11-29", "World Cup 2022", "Group Stage", 1, 2],
  ["KOR", "GHA", "2022-11-28", "World Cup 2022", "Group Stage", 2, 3],
  ["SRB", "CMR", "2022-11-28", "World Cup 2022", "Group Stage", 3, 3],
  ["FRA", "TUN", "2022-11-30", "World Cup 2022", "Group Stage", 0, 1],
  ["AUS", "DEN", "2022-11-30", "World Cup 2022", "Group Stage", 1, 0],
  ["POL", "ARG", "2022-11-30", "World Cup 2022", "Group Stage", 0, 2],
  ["CRC", "GER", "2022-12-01", "World Cup 2022", "Group Stage", 2, 4],
  ["JPN", "ESP", "2022-12-01", "World Cup 2022", "Group Stage", 2, 1],
  ["CRO", "BEL", "2022-12-01", "World Cup 2022", "Group Stage", 0, 0],
  ["GHA", "URU", "2022-12-02", "World Cup 2022", "Group Stage", 0, 2],
  ["KOR", "POR", "2022-12-02", "World Cup 2022", "Group Stage", 2, 1],
  ["CMR", "BRA", "2022-12-02", "World Cup 2022", "Group Stage", 1, 0],
  ["NED", "USA", "2022-12-03", "World Cup 2022", "Round of 16", 3, 1],
  ["ARG", "AUS", "2022-12-03", "World Cup 2022", "Round of 16", 2, 1],
  ["CRO", "JPN", "2022-12-05", "World Cup 2022", "Round of 16", 1, 1],
  ["BRA", "KOR", "2022-12-05", "World Cup 2022", "Round of 16", 4, 1],
  ["ENG", "SEN", "2022-12-04", "World Cup 2022", "Round of 16", 3, 0],
  ["MAR", "ESP", "2022-12-06", "World Cup 2022", "Round of 16", 0, 0],
  ["POR", "SUI", "2022-12-06", "World Cup 2022", "Round of 16", 6, 1],
  ["NED", "ARG", "2022-12-09", "World Cup 2022", "Quarter-finals", 2, 2],
  ["CRO", "BRA", "2022-12-09", "World Cup 2022", "Quarter-finals", 1, 1],
  ["ENG", "FRA", "2022-12-10", "World Cup 2022", "Quarter-finals", 1, 2],
  ["MAR", "POR", "2022-12-10", "World Cup 2022", "Quarter-finals", 1, 0],
  ["ARG", "CRO", "2022-12-13", "World Cup 2022", "Semi-finals", 3, 0],
  ["FRA", "MAR", "2022-12-14", "World Cup 2022", "Semi-finals", 2, 0],
  ["ARG", "FRA", "2022-12-18", "World Cup 2022", "Final", 3, 3],
]

async function main() {
  console.log("Seeding head-to-head data...")

  const teams = await prisma.team.findMany({ select: { id: true, name: true, fifaCode: true } })
  const teamByCode = new Map(teams.filter(t => t.fifaCode).map(t => [t.fifaCode as string, t]))

  await prisma.headToHead.deleteMany()

  let count = 0
  for (const [homeCode, awayCode, dateStr, competition, stage, homeScore, awayScore] of HISTORICAL_MATCHES) {
    const home = teamByCode.get(homeCode)
    const away = teamByCode.get(awayCode)
    if (!home) { console.log("  Skipping: " + homeCode + " not found"); continue }
    if (!away) { console.log("  Skipping: " + awayCode + " not found"); continue }
    await prisma.headToHead.create({
      data: {
        homeTeamId: home.id, awayTeamId: away.id,
        homeTeamName: home.name, awayTeamName: away.name,
        matchDate: new Date(dateStr), competition, stage,
        homeScore, awayScore,
      },
    })
    count++
  }
  console.log("Seeded " + count + " historical head-to-head records")
}

main().catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
