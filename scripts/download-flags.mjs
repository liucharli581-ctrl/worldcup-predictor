import sharp from "sharp"
import fs from "fs"
import path from "path"

// FIFA 3-letter code → ISO 3166-1 alpha-2 mapping
const FIFA_TO_ISO2 = {
  ALG: "dz", ARG: "ar", AUS: "au", AUT: "at", BEL: "be",
  BIH: "ba", BRA: "br", CAN: "ca", CPV: "cv", COL: "co",
  CRO: "hr", CUR: "cw", CZE: "cz", COD: "cd", ECU: "ec",
  EGY: "eg", ENG: "gb-eng", FRA: "fr", GER: "de", GHA: "gh",
  HAI: "ht", IRN: "ir", IRQ: "iq", CIV: "ci", JPN: "jp",
  JOR: "jo", MEX: "mx", MAR: "ma", NED: "nl", NZL: "nz",
  NOR: "no", PAN: "pa", PAR: "py", POR: "pt", QAT: "qa",
  KSA: "sa", SCO: "gb-sct", SEN: "sn", RSA: "za", KOR: "kr",
  ESP: "es", SWE: "se", SUI: "ch", TUN: "tn", TUR: "tr",
  USA: "us", URU: "uy", UZB: "uz",
}

// Alternate sources for regions not well-covered by flagcdn
const ALT_SOURCES = {
  "gb-eng": [
    "https://upload.wikimedia.org/wikipedia/en/thumb/b/be/Flag_of_England.svg/320px-Flag_of_England.svg.png",
    "https://cdn.countryflags.com/thumbs/england/flag-400.png",
  ],
  "gb-sct": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Flag_of_Scotland.svg/320px-Flag_of_Scotland.svg.png",
    "https://cdn.countryflags.com/thumbs/scotland/flag-400.png",
  ],
  cw: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Flag_of_Cura%C3%A7ao.svg/320px-Flag_of_Cura%C3%A7ao.svg.png",
  ],
}

const OUTPUT_DIR = path.resolve("public/images/flags")
const SIZE = 64

async function download(url, timeout = 10000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    return buf
  } finally {
    clearTimeout(timer)
  }
}

async function processTeam(fifaCode, iso2) {
  const outPath = path.join(OUTPUT_DIR, `${fifaCode}.webp`)
  if (fs.existsSync(outPath)) {
    console.log(`  ⏭️  ${fifaCode} - 已存在，跳过`)
    return true
  }

  let buf = null
  const errors = []

  // Try flagcdn first
  if (!ALT_SOURCES[iso2]) {
    const url = `https://flagcdn.com/w160/${iso2}.png`
    try {
      buf = await download(url)
      console.log(`  📥 ${fifaCode} - flagcdn`)
    } catch (e) {
      errors.push(`flagcdn: ${e.message}`)
    }
  }

  // Try alternate sources
  if (!buf && ALT_SOURCES[iso2]) {
    for (const url of ALT_SOURCES[iso2]) {
      try {
        buf = await download(url)
        console.log(`  📥 ${fifaCode} - alt: ${path.basename(new URL(url).pathname)}`)
        break
      } catch (e) {
        errors.push(`alt: ${e.message}`)
      }
    }
  }

  // Try Wikipedia as fallback for any country
  if (!buf) {
    const name = encodeURIComponent(ISO2_TO_COUNTRY[iso2] || fifaCode)
    const wikiUrl = `https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Flag_${name}.svg/320px-Flag_${name}.svg.png`
    try {
      buf = await download(wikiUrl)
      console.log(`  📥 ${fifaCode} - wikipedia`)
    } catch (e) {
      errors.push(`wikipedia: ${e.message}`)
    }
  }

  if (!buf) {
    console.error(`  ❌ ${fifaCode} - 下载失败 (${errors.join(", ")})`)
    return false
  }

  // Resize and convert to WebP
  try {
    await sharp(buf)
      .resize(SIZE, SIZE, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85, effort: 4 })
      .toFile(outPath)
    console.log(`  ✅ ${fifaCode} - 已转换 WebP ${SIZE}px`)
    return true
  } catch (e) {
    console.error(`  ❌ ${fifaCode} - 处理失败: ${e.message}`)
    return false
  }
}

// Wikipedia fallback name lookup
const ISO2_TO_COUNTRY = {
  dz: "Algeria", ar: "Argentina", au: "Australia", at: "Austria",
  be: "Belgium", ba: "Bosnia_and_Herzegovina", br: "Brazil",
  ca: "Canada", cv: "Cape_Verde", co: "Colombia",
  hr: "Croatia", cw: "Curaçao", cz: "Czech_Republic",
  cd: "Democratic_Republic_of_the_Congo", ec: "Ecuador",
  eg: "Egypt", fr: "France", de: "Germany", gh: "Ghana",
  ht: "Haiti", ir: "Iran", iq: "Iraq",
  ci: "Ivory_Coast", jp: "Japan", jo: "Jordan",
  mx: "Mexico", ma: "Morocco", nl: "Netherlands",
  nz: "New_Zealand", no: "Norway", pa: "Panama",
  py: "Paraguay", pt: "Portugal", qa: "Qatar",
  sa: "Saudi_Arabia", sn: "Senegal", za: "South_Africa",
  kr: "South_Korea", es: "Spain", se: "Sweden",
  ch: "Switzerland", tn: "Tunisia", tr: "Turkey",
  us: "United_States", uy: "Uruguay", uz: "Uzbekistan",
}

async function main() {
  console.log("🏳️ 下载球队 Logo/国旗\n")
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const entries = Object.entries(FIFA_TO_ISO2)
  let success = 0
  let fail = 0

  for (const [fifaCode, iso2] of entries) {
    const ok = await processTeam(fifaCode, iso2)
    if (ok) success++
    else fail++
    // Small delay to be polite to CDN
    await new Promise((r) => setTimeout(r, 300))
  }

  console.log(`\n📊 完成: ${success} 成功, ${fail} 失败`)
}

main().catch(console.error)
