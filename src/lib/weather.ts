/**
 * Weather client — Open-Meteo (free, no API key).
 * Forecast for trips within 16 days; historical climate averages for anything further out.
 */

export interface DailyWeather {
  date: string;
  tempMaxC: number;
  tempMinC: number;
  precipChance: number;
  precipMm: number;
  windMaxKph: number;
  /** WMO weather interpretation code. */
  code: number;
  /** Derived condition bucket used by rules + UI. */
  condition: WeatherCondition;
}

export type WeatherCondition =
  | "clear"
  | "cloudy"
  | "rain"
  | "heavy-rain"
  | "thunderstorm"
  | "snow"
  | "fog";

export interface ClimateMonth {
  month: number;
  tempMaxC: number;
  tempMinC: number;
  rainDays: number;
  precipMm: number;
}

const WMO: Record<number, { label: string; condition: WeatherCondition }> = {
  0: { label: "Clear sky", condition: "clear" },
  1: { label: "Mainly clear", condition: "clear" },
  2: { label: "Partly cloudy", condition: "cloudy" },
  3: { label: "Overcast", condition: "cloudy" },
  45: { label: "Fog", condition: "fog" },
  48: { label: "Rime fog", condition: "fog" },
  51: { label: "Light drizzle", condition: "rain" },
  53: { label: "Drizzle", condition: "rain" },
  55: { label: "Heavy drizzle", condition: "rain" },
  56: { label: "Freezing drizzle", condition: "rain" },
  57: { label: "Freezing drizzle", condition: "rain" },
  61: { label: "Light rain", condition: "rain" },
  63: { label: "Rain", condition: "rain" },
  65: { label: "Heavy rain", condition: "heavy-rain" },
  66: { label: "Freezing rain", condition: "rain" },
  67: { label: "Freezing rain", condition: "rain" },
  71: { label: "Light snow", condition: "snow" },
  73: { label: "Snow", condition: "snow" },
  75: { label: "Heavy snow", condition: "snow" },
  77: { label: "Snow grains", condition: "snow" },
  80: { label: "Rain showers", condition: "rain" },
  81: { label: "Rain showers", condition: "rain" },
  82: { label: "Violent showers", condition: "heavy-rain" },
  85: { label: "Snow showers", condition: "snow" },
  86: { label: "Heavy snow showers", condition: "snow" },
  95: { label: "Thunderstorm", condition: "thunderstorm" },
  96: { label: "Thunderstorm & hail", condition: "thunderstorm" },
  99: { label: "Severe thunderstorm", condition: "thunderstorm" },
};

export function describeCode(code: number): { label: string; condition: WeatherCondition } {
  return WMO[code] ?? { label: "—", condition: "cloudy" };
}

function mapDaily(d: {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max: number[];
  precipitation_sum: number[];
  wind_speed_10m_max: number[];
  weather_code: number[];
}): DailyWeather[] {
  return d.time.map((date, i) => {
    const code = d.weather_code[i] ?? 0;
    const { condition } = describeCode(code);
    return {
      date,
      tempMaxC: Math.round(d.temperature_2m_max[i]),
      tempMinC: Math.round(d.temperature_2m_min[i]),
      precipChance: d.precipitation_probability_max[i] ?? 0,
      precipMm: d.precipitation_sum[i] ?? 0,
      windMaxKph: Math.round(d.wind_speed_10m_max[i] ?? 0),
      code,
      condition,
    };
  });
}

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

/** Up to 16 days of daily forecast from a given start date. */
export async function fetchForecast(
  lat: number,
  lng: number,
  startDate: string,
  days: number,
): Promise<DailyWeather[]> {
  const url =
    `${FORECAST_URL}?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,weather_code` +
    `&timezone=auto&start_date=${startDate}&end_date=${shiftDate(startDate, days - 1)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo forecast failed (${res.status})`);
  const json = await res.json();
  return mapDaily(json.daily);
}

const CLIMATE_URL = "https://climate-api.open-meteo.com/v1/climate";
const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const CLIMATE_API_KEY = process.env.OPEN_METEO_API_KEY ?? "";

/**
 * Monthly climate normals (1991–2020). Prefers the Open-Meteo Climate API when
 * OPEN_METEO_API_KEY is set (the endpoint moved behind a paid plan), and
 * otherwise derives the same normals from the free ERA5 archive — 30 years of
 * observed daily weather aggregated per calendar month.
 */
export async function fetchClimate(
  lat: number,
  lng: number,
  /** Kept for API stability — climate normals aggregate every month. */
  month: number,
): Promise<ClimateMonth[]> {
  void month;
  if (CLIMATE_API_KEY) {
    try {
      return await climateNormalsFromModelApi(lat, lng);
    } catch {
      // fall through to the free archive
    }
  }
  return archiveNormals(lat, lng);
}

async function climateNormalsFromModelApi(lat: number, lng: number): Promise<ClimateMonth[]> {
  const url =
    `${CLIMATE_URL}?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
    `&start_year=1991&end_year=2020&models=ERA5,ERA5_LAND,CMCC_CM2_VHR4` +
    `&monthly=temperature_2m_mean,precipitation_sum&apikey=${CLIMATE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo climate failed (${res.status})`);
  const json = await res.json();
  const monthly = json.monthly ?? {};
  const times: string[] = monthly.time ?? [];
  const temps: number[] = monthly.temperature_2m_mean ?? [];
  const prec: number[] = monthly.precipitation_sum ?? [];

  // Aggregate per calendar month across years.
  const byMonth = new Map<number, { t: number[]; p: number[] }>();
  times.forEach((t, i) => {
    const m = Number(t.slice(5, 7));
    if (!byMonth.has(m)) byMonth.set(m, { t: [], p: [] });
    byMonth.get(m)!.t.push(temps[i] ?? 0);
    byMonth.get(m)!.p.push(prec[i] ?? 0);
  });

  return [...byMonth.entries()]
    .map(([m, v]) => ({
      month: m,
      tempMaxC: Math.round(Math.max(...v.t)),
      tempMinC: Math.round(Math.min(...v.t)),
      rainDays: Math.round(v.p.filter((p) => p > 1).length / Math.max(1, v.p.length / 30)),
      precipMm: Math.round(v.p.reduce((s, p) => s + p, 0) / Math.max(1, v.p.length)),
    }))
    .sort((a, b) => a.month - b.month);
}

async function archiveNormals(lat: number, lng: number): Promise<ClimateMonth[]> {
  const url =
    `${ARCHIVE_URL}?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
    `&start_date=1991-01-01&end_date=2020-12-31` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
    (CLIMATE_API_KEY ? `&apikey=${CLIMATE_API_KEY}` : "");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo archive failed (${res.status})`);
  const json = await res.json();
  const daily = json.daily ?? {};
  const times: string[] = daily.time ?? [];
  const tMax: number[] = daily.temperature_2m_max ?? [];
  const tMin: number[] = daily.temperature_2m_min ?? [];
  const prec: number[] = daily.precipitation_sum ?? [];

  // Aggregate ~30 years of daily observations per calendar month.
  const byMonth = new Map<number, { hi: number; lo: number; n: number; rainDays: number; precip: number }>();
  times.forEach((t, i) => {
    const m = Number(t.slice(5, 7));
    const bucket = byMonth.get(m) ?? { hi: 0, lo: 0, n: 0, rainDays: 0, precip: 0 };
    if (typeof tMax[i] === "number") {
      bucket.hi += tMax[i];
      bucket.lo += tMin[i] ?? 0;
      bucket.n++;
    }
    if (typeof prec[i] === "number") {
      if (prec[i] > 1) bucket.rainDays++;
      bucket.precip += prec[i];
    }
    byMonth.set(m, bucket);
  });

  // ≈920 days per calendar-month bucket over 30 years; scale counts to per-month values.
  return [...byMonth.entries()]
    .map(([m, v]) => ({
      month: m,
      tempMaxC: Math.round(v.hi / Math.max(1, v.n)),
      tempMinC: Math.round(v.lo / Math.max(1, v.n)),
      rainDays: Math.round((v.rainDays / Math.max(1, v.n)) * 30),
      precipMm: Math.round(v.precip / Math.max(1, v.n / 30)),
    }))
    .sort((a, b) => a.month - b.month);
}

export function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** How many days from today until iso date (can be negative). */
export function daysUntil(iso: string): number {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const target = new Date(iso + "T00:00:00Z");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}
