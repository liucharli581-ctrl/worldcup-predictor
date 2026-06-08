// 国家 → 国旗 Emoji 映射
const COUNTRY_FLAGS: Record<string, string> = {
  "Mexico": "🇲🇽",
  "Canada": "🇨🇦",
  "United States": "🇺🇸",
  "Brazil": "🇧🇷",
  "Morocco": "🇲🇦",
  "Portugal": "🇵🇹",
  "Argentina": "🇦🇷",
  "Spain": "🇪🇸",
  "France": "🇫🇷",
  "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Germany": "🇩🇪",
  "Italy": "🇮🇹",
  "Netherlands": "🇳🇱",
  "Belgium": "🇧🇪",
  "Croatia": "🇭🇷",
  "Japan": "🇯🇵",
  "South Korea": "🇰🇷",
  "Uruguay": "🇺🇾",
  "Colombia": "🇨🇴",
  "Chile": "🇨🇱",
  "Ecuador": "🇪🇨",
  "Peru": "🇵🇪",
  "Paraguay": "🇵🇾",
  "Venezuela": "🇻🇪",
  "Nigeria": "🇳🇬",
  "Senegal": "🇸🇳",
  "Ghana": "🇬🇭",
  "Cameroon": "🇨🇲",
  "Egypt": "🇪🇬",
  "Tunisia": "🇹🇳",
  "Algeria": "🇩🇿",
  "Ivory Coast": "🇨🇮",
  "Australia": "🇦🇺",
  "Saudi Arabia": "🇸🇦",
  "Iran": "🇮🇷",
  "Qatar": "🇶🇦",
  "UAE": "🇦🇪",
  "Switzerland": "🇨🇭",
  "Denmark": "🇩🇰",
  "Sweden": "🇸🇪",
  "Norway": "🇳🇴",
  "Poland": "🇵🇱",
  "Ukraine": "🇺🇦",
  "Serbia": "🇷🇸",
  "Turkey": "🇹🇷",
  "Austria": "🇦🇹",
  "Czech Republic": "🇨🇿",
  "Wales": "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "Hungary": "🇭🇺",
  "Romania": "🇷🇴",
  "Greece": "🇬🇷",
  "Russia": "🇷🇺",
  "Slovakia": "🇸🇰",
  "Slovenia": "🇸🇮",
  "Costa Rica": "🇨🇷",
  "Jamaica": "🇯🇲",
  "Honduras": "🇭🇳",
  "Panama": "🇵🇦",
  "New Zealand": "🇳🇿",
  "China": "🇨🇳",
  "Iraq": "🇮🇶",
  "South Africa": "🇿🇦",
  "DR Congo": "🇨🇩",
  "Burkina Faso": "🇧🇫",
  "Mali": "🇲🇱",
  "Guinea": "🇬🇳",
  "Zambia": "🇿🇲",
  "Equatorial Guinea": "🇬🇶",
  "Togo": "🇹🇬",
  "Sudan": "🇸🇩",
  "Comoros": "🇰🇲",
  "Tanzania": "🇹🇿",
  "Bolivia": "🇧🇴",
}

export function getTeamFlag(country?: string | null): string {
  if (!country) return ""
  const trimmed = country.trim()
  return COUNTRY_FLAGS[trimmed] ?? getFlagFromEmoji(trimmed)
}

function getFlagFromEmoji(country: string): string {
  // Fallback: try to generate flag from country code using first 2 letters
  // This only works for ISO-3166-1 alpha-2 codes, not full country names
  return ""
}

// Get flag by team name (also check country field)
export function getFlagEmoji(country?: string | null): string {
  return getTeamFlag(country)
}

// Known FIFA country codes to country name mapping
const FIFA_CODE_TO_COUNTRY: Record<string, string> = {
  MEX: "Mexico", CAN: "Canada", USA: "United States",
  BRA: "Brazil", MAR: "Morocco", POR: "Portugal",
  ARG: "Argentina", ESP: "Spain", FRA: "France",
  ENG: "England", GER: "Germany", ITA: "Italy",
  NED: "Netherlands", BEL: "Belgium", CRO: "Croatia",
  JPN: "Japan", KOR: "South Korea", URU: "Uruguay",
  COL: "Colombia", CHI: "Chile", ECU: "Ecuador",
  PER: "Peru", PAR: "Paraguay", VEN: "Venezuela",
  NGA: "Nigeria", SEN: "Senegal", GHA: "Ghana",
  CMR: "Cameroon", EGY: "Egypt", TUN: "Tunisia",
  ALG: "Algeria", CIV: "Ivory Coast", AUS: "Australia",
  KSA: "Saudi Arabia", IRN: "Iran", QAT: "Qatar",
  UAE: "UAE", SUI: "Switzerland", DEN: "Denmark",
  SWE: "Sweden", NOR: "Norway", POL: "Poland",
  UKR: "Ukraine", SRB: "Serbia", TUR: "Turkey",
  AUT: "Austria", CZE: "Czech Republic", WAL: "Wales",
  SCO: "Scotland", HUN: "Hungary", ROU: "Romania",
  GRE: "Greece", RUS: "Russia", SVK: "Slovakia",
  SVN: "Slovenia", CRC: "Costa Rica", JAM: "Jamaica",
  HON: "Honduras", PAN: "Panama", NZL: "New Zealand",
  CHN: "China", IRQ: "Iraq", RSA: "South Africa",
  COD: "DR Congo", BFA: "Burkina Faso", MLI: "Mali",
  GUI: "Guinea", ZAM: "Zambia", EQG: "Equatorial Guinea",
  TOG: "Togo", SDN: "Sudan", COM: "Comoros",
  TAN: "Tanzania", BOL: "Bolivia",
}

export function getFlagByFifaCode(fifaCode?: string | null): string {
  if (!fifaCode) return ""
  const country = FIFA_CODE_TO_COUNTRY[fifaCode.toUpperCase()]
  return country ? getTeamFlag(country) : ""
}
