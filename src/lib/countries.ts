/** Country-level daily cost baselines in USD, used by the budget engine. */

export interface CountryCost {
  code: string;
  name: string;
  /** Lodging per night for each budget tier 1–5 (USD). */
  lodging: [number, number, number, number, number];
  /** Food per day for each budget tier 1–5 (USD). */
  food: [number, number, number, number, number];
  /** Local transport per day, tier-independent (USD). */
  localTransport: number;
}

export const COUNTRY_COSTS: Record<string, CountryCost> = {
  CHE: { code: "CHE", name: "Switzerland", lodging: [70, 110, 180, 300, 550], food: [30, 45, 70, 110, 180], localTransport: 20 },
  NOR: { code: "NOR", name: "Norway", lodging: [65, 100, 160, 280, 500], food: [28, 40, 65, 100, 170], localTransport: 18 },
  ISL: { code: "ISL", name: "Iceland", lodging: [60, 95, 150, 260, 480], food: [28, 42, 65, 100, 165], localTransport: 18 },
  DNK: { code: "DNK", name: "Denmark", lodging: [55, 85, 140, 240, 430], food: [22, 35, 55, 90, 150], localTransport: 12 },
  SWE: { code: "SWE", name: "Sweden", lodging: [50, 80, 130, 220, 400], food: [20, 32, 50, 85, 140], localTransport: 12 },
  FIN: { code: "FIN", name: "Finland", lodging: [50, 78, 125, 210, 380], food: [20, 30, 48, 80, 135], localTransport: 11 },
  NLD: { code: "NLD", name: "Netherlands", lodging: [55, 85, 130, 230, 420], food: [18, 30, 48, 80, 135], localTransport: 10 },
  IRL: { code: "IRL", name: "Ireland", lodging: [50, 80, 125, 210, 380], food: [18, 28, 45, 75, 130], localTransport: 10 },
  GBR: { code: "GBR", name: "United Kingdom", lodging: [48, 78, 120, 200, 380], food: [16, 28, 45, 75, 125], localTransport: 11 },
  FRA: { code: "FRA", name: "France", lodging: [45, 75, 120, 200, 400], food: [15, 26, 42, 70, 130], localTransport: 10 },
  DEU: { code: "DEU", name: "Germany", lodging: [42, 68, 110, 180, 340], food: [14, 24, 40, 65, 120], localTransport: 10 },
  AUT: { code: "AUT", name: "Austria", lodging: [45, 72, 115, 190, 350], food: [15, 25, 40, 68, 120], localTransport: 10 },
  BEL: { code: "BEL", name: "Belgium", lodging: [45, 70, 110, 185, 340], food: [15, 25, 40, 68, 120], localTransport: 10 },
  ITA: { code: "ITA", name: "Italy", lodging: [40, 65, 110, 190, 380], food: [14, 24, 40, 68, 125], localTransport: 9 },
  ESP: { code: "ESP", name: "Spain", lodging: [35, 58, 95, 165, 340], food: [12, 22, 35, 60, 115], localTransport: 8 },
  PRT: { code: "PRT", name: "Portugal", lodging: [32, 52, 85, 150, 320], food: [11, 20, 32, 55, 105], localTransport: 8 },
  GRC: { code: "GRC", name: "Greece", lodging: [32, 52, 88, 155, 330], food: [11, 20, 33, 58, 110], localTransport: 8 },
  HRV: { code: "HRV", name: "Croatia", lodging: [30, 50, 82, 145, 300], food: [11, 19, 30, 52, 100], localTransport: 8 },
  POL: { code: "POL", name: "Poland", lodging: [25, 40, 65, 110, 220], food: [9, 15, 24, 42, 85], localTransport: 6 },
  CZE: { code: "CZE", name: "Czechia", lodging: [26, 42, 68, 115, 230], food: [9, 16, 26, 45, 90], localTransport: 6 },
  HUN: { code: "HUN", name: "Hungary", lodging: [24, 38, 62, 105, 210], food: [8, 14, 23, 40, 80], localTransport: 5 },
  ROU: { code: "ROU", name: "Romania", lodging: [22, 35, 58, 100, 200], food: [8, 13, 22, 38, 75], localTransport: 5 },
  BGR: { code: "BGR", name: "Bulgaria", lodging: [20, 32, 55, 95, 190], food: [7, 12, 20, 35, 70], localTransport: 5 },
  TUR: { code: "TUR", name: "Turkey", lodging: [20, 35, 60, 110, 250], food: [7, 13, 22, 40, 85], localTransport: 5 },
  GEO: { code: "GEO", name: "Georgia", lodging: [18, 30, 52, 95, 200], food: [6, 11, 19, 35, 70], localTransport: 4 },
  ARM: { code: "ARM", name: "Armenia", lodging: [18, 28, 50, 90, 190], food: [6, 10, 18, 33, 65], localTransport: 4 },
  MAR: { code: "MAR", name: "Morocco", lodging: [16, 28, 50, 95, 210], food: [6, 10, 18, 33, 70], localTransport: 4 },
  EGY: { code: "EGY", name: "Egypt", lodging: [15, 26, 45, 85, 200], food: [5, 9, 16, 30, 65], localTransport: 4 },
  ZAF: { code: "ZAF", name: "South Africa", lodging: [22, 38, 65, 120, 260], food: [8, 13, 22, 40, 85], localTransport: 6 },
  KEN: { code: "KEN", name: "Kenya", lodging: [20, 35, 65, 130, 300], food: [7, 12, 20, 38, 90], localTransport: 6 },
  TZA: { code: "TZA", name: "Tanzania", lodging: [20, 35, 70, 150, 350], food: [7, 12, 21, 40, 95], localTransport: 6 },
  NAM: { code: "NAM", name: "Namibia", lodging: [22, 38, 68, 125, 270], food: [8, 13, 22, 40, 85], localTransport: 8 },
  UGA: { code: "UGA", name: "Uganda", lodging: [18, 30, 55, 110, 250], food: [6, 10, 18, 34, 75], localTransport: 5 },
  USA: { code: "USA", name: "United States", lodging: [50, 80, 135, 230, 450], food: [16, 28, 45, 78, 140], localTransport: 12 },
  CAN: { code: "CAN", name: "Canada", lodging: [45, 75, 125, 210, 400], food: [15, 26, 42, 72, 130], localTransport: 11 },
  MEX: { code: "MEX", name: "Mexico", lodging: [22, 38, 65, 120, 260], food: [7, 13, 22, 40, 85], localTransport: 5 },
  GTM: { code: "GTM", name: "Guatemala", lodging: [15, 25, 45, 85, 190], food: [5, 9, 16, 30, 65], localTransport: 4 },
  CRI: { code: "CRI", name: "Costa Rica", lodging: [22, 38, 65, 125, 280], food: [8, 13, 22, 42, 90], localTransport: 6 },
  PAN: { code: "PAN", name: "Panama", lodging: [22, 36, 62, 115, 250], food: [8, 13, 22, 40, 85], localTransport: 6 },
  CUB: { code: "CUB", name: "Cuba", lodging: [20, 32, 55, 100, 220], food: [7, 11, 19, 35, 75], localTransport: 5 },
  JAM: { code: "JAM", name: "Jamaica", lodging: [24, 40, 70, 130, 290], food: [9, 14, 24, 45, 95], localTransport: 6 },
  BHS: { code: "BHS", name: "Bahamas", lodging: [35, 60, 105, 190, 400], food: [12, 20, 34, 62, 130], localTransport: 8 },
  BRA: { code: "BRA", name: "Brazil", lodging: [20, 35, 60, 115, 250], food: [7, 12, 21, 40, 85], localTransport: 5 },
  ARG: { code: "ARG", name: "Argentina", lodging: [18, 32, 55, 105, 230], food: [6, 11, 19, 36, 80], localTransport: 4 },
  CHL: { code: "CHL", name: "Chile", lodging: [20, 34, 58, 110, 240], food: [7, 12, 20, 38, 82], localTransport: 5 },
  PER: { code: "PER", name: "Peru", lodging: [14, 25, 45, 90, 210], food: [5, 9, 16, 30, 70], localTransport: 4 },
  BOL: { code: "BOL", name: "Bolivia", lodging: [12, 20, 35, 70, 160], food: [4, 7, 13, 25, 55], localTransport: 3 },
  ECU: { code: "ECU", name: "Ecuador", lodging: [14, 25, 45, 88, 200], food: [5, 9, 16, 30, 68], localTransport: 4 },
  COL: { code: "COL", name: "Colombia", lodging: [14, 25, 45, 85, 195], food: [5, 9, 16, 30, 68], localTransport: 4 },
  URY: { code: "URY", name: "Uruguay", lodging: [20, 34, 58, 108, 235], food: [7, 12, 20, 38, 82], localTransport: 5 },
  JPN: { code: "JPN", name: "Japan", lodging: [35, 55, 95, 170, 380], food: [12, 20, 33, 58, 115], localTransport: 9 },
  KOR: { code: "KOR", name: "South Korea", lodging: [28, 45, 78, 140, 320], food: [10, 16, 27, 48, 100], localTransport: 7 },
  CHN: { code: "CHN", name: "China", lodging: [20, 35, 60, 110, 250], food: [7, 12, 20, 38, 85], localTransport: 5 },
  TWN: { code: "TWN", name: "Taiwan", lodging: [24, 38, 65, 118, 260], food: [8, 13, 22, 42, 90], localTransport: 6 },
  HKG: { code: "HKG", name: "Hong Kong", lodging: [40, 65, 110, 190, 400], food: [12, 20, 34, 62, 125], localTransport: 8 },
  VNM: { code: "VNM", name: "Vietnam", lodging: [10, 18, 32, 65, 160], food: [4, 7, 12, 24, 55], localTransport: 3 },
  THA: { code: "THA", name: "Thailand", lodging: [12, 20, 38, 75, 180], food: [4, 8, 14, 27, 62], localTransport: 4 },
  LAO: { code: "LAO", name: "Laos", lodging: [10, 18, 32, 62, 150], food: [4, 7, 12, 23, 52], localTransport: 3 },
  KHM: { code: "KHM", name: "Cambodia", lodging: [10, 18, 32, 65, 155], food: [4, 7, 12, 24, 55], localTransport: 3 },
  MMR: { code: "MMR", name: "Myanmar", lodging: [12, 20, 36, 70, 165], food: [4, 8, 13, 26, 58], localTransport: 3 },
  MYS: { code: "MYS", name: "Malaysia", lodging: [14, 24, 42, 82, 190], food: [5, 9, 15, 29, 65], localTransport: 4 },
  SGP: { code: "SGP", name: "Singapore", lodging: [35, 60, 105, 185, 400], food: [10, 17, 30, 55, 115], localTransport: 7 },
  IDN: { code: "IDN", name: "Indonesia", lodging: [12, 20, 38, 75, 180], food: [4, 8, 14, 27, 62], localTransport: 3 },
  PHL: { code: "PHL", name: "Philippines", lodging: [12, 20, 36, 72, 170], food: [4, 8, 13, 26, 58], localTransport: 4 },
  IND: { code: "IND", name: "India", lodging: [8, 15, 30, 60, 150], food: [3, 6, 10, 20, 48], localTransport: 3 },
  NPL: { code: "NPL", name: "Nepal", lodging: [8, 14, 26, 52, 130], food: [3, 6, 10, 19, 45], localTransport: 3 },
  LKA: { code: "LKA", name: "Sri Lanka", lodging: [12, 20, 36, 70, 160], food: [4, 8, 13, 26, 58], localTransport: 3 },
  BTN: { code: "BTN", name: "Bhutan", lodging: [25, 40, 65, 110, 220], food: [8, 13, 22, 40, 85], localTransport: 6 },
  UZB: { code: "UZB", name: "Uzbekistan", lodging: [14, 24, 42, 80, 180], food: [5, 8, 14, 27, 60], localTransport: 4 },
  IRN: { code: "IRN", name: "Iran", lodging: [14, 24, 42, 80, 180], food: [5, 8, 14, 27, 60], localTransport: 4 },
  JOR: { code: "JOR", name: "Jordan", lodging: [20, 35, 62, 115, 250], food: [7, 12, 21, 40, 85], localTransport: 6 },
  ISR: { code: "ISR", name: "Israel", lodging: [35, 55, 92, 165, 350], food: [11, 18, 30, 55, 115], localTransport: 8 },
  ARE: { code: "ARE", name: "United Arab Emirates", lodging: [35, 60, 105, 190, 420], food: [11, 18, 32, 60, 125], localTransport: 8 },
  OMN: { code: "OMN", name: "Oman", lodging: [25, 42, 72, 130, 280], food: [8, 14, 24, 45, 95], localTransport: 7 },
  SAU: { code: "SAU", name: "Saudi Arabia", lodging: [28, 45, 78, 140, 300], food: [9, 15, 26, 48, 100], localTransport: 7 },
  AUS: { code: "AUS", name: "Australia", lodging: [45, 72, 118, 200, 380], food: [15, 25, 42, 72, 130], localTransport: 11 },
  NZL: { code: "NZL", name: "New Zealand", lodging: [40, 65, 105, 180, 340], food: [13, 22, 36, 62, 115], localTransport: 10 },
  FJI: { code: "FJI", name: "Fiji", lodging: [25, 42, 75, 140, 300], food: [9, 14, 24, 45, 95], localTransport: 6 },
};

export function costForCountry(code: string): CountryCost {
  return COUNTRY_COSTS[code] ?? COUNTRY_COSTS.USA;
}
