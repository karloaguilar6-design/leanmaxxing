// node test.js: comprueba la matemática de calc.js
const assert = require('node:assert')
const L = require('./calc.js')
const near = (a, b, tol = 1) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`)

assert.strictEqual(L.kcal({ p: 150, c: 200, f: 60 }), 1940)
assert.strictEqual(L.kcal({ p: 150, c: 200 }), null)
assert.match(L.today(), /^\d{4}-\d{2}-\d{2}$/)
assert.strictEqual(L.addDays('2026-10-01', 30), '2026-10-31')

// 28 días bajando 0.5 kg/sem y comiendo 2000 kcal → mantenimiento 2550, meta 2000
const db = {}
for (let i = 0; i < 28; i++) db[L.addDays('2026-10-01', i)] = { w: 90 - i * 0.5 / 7, p: 165, c: 200, f: 60 }
let m = L.model(db, '2026-10-28')
near(m.tdee, 2550); near(m.target, 2000); near(m.rate, -0.5, 0.001)

// con 10 días todavía calibra
assert.deepStrictEqual(L.model(db, '2026-10-10'), { n: 10 })

// mantenimiento de 1800 → la meta topa en 75 % (1350), no en 1250
const flat = {}
for (let i = 0; i < 20; i++) flat[L.addDays('2026-10-01', i)] = { w: 80, p: 135, c: 180, f: 60 }
m = L.model(flat, '2026-10-20')
near(m.tdee, 1800); near(m.target, 1350); assert.ok(m.pace > L.GOAL)

// peso constante → tendencia constante; z centrado en tu promedio
assert.deepStrictEqual(Object.values(L.trend(flat)), Array(20).fill(80))
assert.deepStrictEqual(L.zscore([1, null, 3]).z, [-1, null, 1])

// una meta más agresiva (−1 kg/sem) topa en el piso del 75 %
m = L.model(db, '2026-10-28', -1)
near(m.target, 0.75 * 2550)

// mediana: impar y par
assert.strictEqual(L.median([3, 1, 2]), 2)
assert.strictEqual(L.median([4, 1, 3, 2]), 2.5)

// semana lunes 19 a domingo 25 de octubre: 7 registros; el día raro de 86 kg no la mueve (la media daría 81)
const wk = Object.fromEntries([80.4, 80.2, 80.0, 86.0, 79.9, 80.1, 80.3].map((w, i) => [L.addDays('2026-10-19', i), { w }]))
wk['2026-10-18'] = { w: 81 }     // domingo anterior → semana del 12
wk['2026-10-26'] = { w: 79.8 }   // lunes siguiente → semana nueva
wk['2026-10-27'] = { s: 420 }    // día sin peso → no cuenta
const ws = L.weekly(wk)
assert.deepStrictEqual(ws.map(w => [w.mon, w.n]), [['2026-10-12', 1], ['2026-10-19', 7], ['2026-10-26', 1]])
assert.strictEqual(ws[1].med, 80.2)

// importación: solo respaldos válidos
assert.ok(L.validDb({ '2026-10-24': { w: 84.6, s: 435, p: 150, c: 200, f: 60, st: 8420 } }))
for (const bad of [null, [], { ayer: { w: 80 } }, { '2026-02-30': { w: 80 } }, { '2026-10-24': { w: 900 } },
  { '2026-10-24': { w: '84' } }, { '2026-10-24': { x: 1 } }, { '2026-10-24': null }])
  assert.ok(!L.validDb(bad), JSON.stringify(bad))

console.log('ok')
