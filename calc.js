// leanmaxxing: matemáticas puras, sin DOM. Se carga en el navegador (<script src>) y en Node (test.js).
// Un registro por mañana de check-in: { w: peso de hoy kg, s: sueño de anoche min, p c f: macros de ayer g, st: pasos de ayer }.
// Así cada fila junta la causa (ayer + la noche) con el efecto (el peso de hoy).

const GOAL = -0.5        // kg/sem
const KCAL_KG = 7700     // ponytail: aproximación estándar de 1 kg de grasa; el modelo absorbe el error
const WINDOW = 28        // días que mira el modelo
const MIN_DAYS = 14      // días con peso y con kcal antes de dar meta
const FLOOR = 0.75       // la meta nunca baja del 75 % del mantenimiento
const SLEEP_GOAL = 480   // min
const STEPS_GOAL = 8000
const RANGES = { w: [30, 300], s: [0, 960], p: [0, 600], c: [0, 1000], f: [0, 400], st: [0, 100000] }

const kcal = r => r.p != null && r.c != null && r.f != null ? 4 * r.p + 4 * r.c + 9 * r.f : null
const mean = a => a.reduce((s, v) => s + v, 0) / a.length

// fecha local YYYY-MM-DD (no UTC); la aritmética va en UTC sobre fechas sin hora, sin líos de horario de verano
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10)
const dayNum = d => Date.parse(d + 'T00:00Z') / 864e5
const addDays = (d, n) => new Date((dayNum(d) + n) * 864e5).toISOString().slice(0, 10)

// tendencia: EMA α=0.1 sobre los días con peso
// ponytail: ignora el largo de los huecos; con registro casi diario no importa
function trend(db) {
  const out = {}
  let t
  for (const d of Object.keys(db).sort()) {
    const w = db[d].w
    if (w != null) out[d] = t = t == null ? w : t + 0.1 * (w - t)
  }
  return out
}

// pendiente por mínimos cuadrados
function slope(xs, ys) {
  const mx = mean(xs), my = mean(ys)
  let num = 0, den = 0
  xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2 })
  return den ? num / den : 0
}

// ritmo, mantenimiento real y meta de hoy con los últimos 28 días; solo { n } mientras calibra
function model(db, end = today()) {
  const start = addDays(end, 1 - WINDOW), xs = [], ws = [], ks = []
  for (const d in db) {
    if (d < start || d > end) continue
    const r = db[d], k = kcal(r)
    if (r.w != null) { xs.push(dayNum(d)); ws.push(r.w) }
    if (k != null) ks.push(k)
  }
  const n = Math.min(ws.length, ks.length)
  if (n < MIN_DAYS) return { n }
  const b = slope(xs, ws)                                    // kg/día
  const tdee = mean(ks) - b * KCAL_KG
  const target = Math.max(tdee + GOAL * KCAL_KG / 7, tdee * FLOOR)
  return { n, rate: b * 7, tdee, target, pace: (target - tdee) * 7 / KCAL_KG }
}

// desviación de tu promedio (z) de cada valor de la serie, recortada a ±2.5
function zscore(vals) {
  const xs = vals.filter(v => v != null), m = mean(xs)
  const sd = Math.sqrt(mean(xs.map(v => (v - m) ** 2))) || 1
  return { m, sd, z: vals.map(v => v == null ? null : Math.max(-2.5, Math.min(2.5, (v - m) / sd))) }
}

// valida un respaldo importado: fechas reales, solo campos conocidos, números en rango
const realDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(dayNum(d)) && addDays(d, 0) == d
const validDb = db => !!db && typeof db == 'object' && !Array.isArray(db) && Object.entries(db).every(([d, r]) =>
  realDate(d) && !!r && typeof r == 'object' &&
  Object.entries(r).every(([k, v]) => RANGES[k] && typeof v == 'number' && v >= RANGES[k][0] && v <= RANGES[k][1]))

if (typeof module == 'object') module.exports = { GOAL, RANGES, kcal, today, addDays, trend, slope, model, zscore, validDb }
