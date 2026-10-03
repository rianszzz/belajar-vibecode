// Durasi backoff untuk attempt ke-N. Dipisah dari outbox.js agar bisa dites Node murni.
const STEPS = [30_000, 120_000, 300_000, 600_000, 1_800_000]
const MAX = 1_800_000

export function backoffFor(attempts) {
  const base = STEPS[Math.min(attempts - 1, STEPS.length - 1)] || MAX
  const jitter = base * 0.1
  return base + Math.random() * jitter
}
