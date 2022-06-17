import { readFileSync } from 'fs'
import { Argon2 } from './argon2.js'
import { BenchmarkCurve } from './curve.js'
import { webcrypto } from 'node:crypto'
const crypto = webcrypto as unknown as Crypto // @types/node doesn't contain proper definitions for node webcrypto at the time of writing

// Load the wasm files for argon2
const wasmBasePath = 'node_modules/@very-amused/argon2-wasm/build'
const wasm = {
  argon2: readFileSync(`${wasmBasePath}/argon2.wasm`),
  argon2Simd: readFileSync(`${wasmBasePath}/argon2-simd.wasm`)
}

type Benchmark = {
  // Constants
  time: number
  parallelism: number
  simd: boolean
  password: string

  // Min and max memory values, in KiB
  minMemory: number
  maxMemory: number

  // The resolution of the generated curve, equal to the number of tests to be run - 1
  segments: number
}
export type MemoryBenchmark = Benchmark

async function runBenchmark(b: Benchmark): Promise<void> {
  // Initialize the curve output
  const dir = `t${b.time}_p${b.parallelism}`
  const filename = `${b.minMemory}-${b.maxMemory}` + (b.simd ? '_simd' : '')
  const curve = new BenchmarkCurve(`results/memory/${dir}/${filename}.csv`)

  // Generate a random salt
  const salt = crypto.getRandomValues(new Uint8Array(16))

  const increment = Math.floor((b.maxMemory - b.minMemory) / b.segments)
  outer:
  for (let i = 0; i <= b.segments; i++) {
    const memory = i === b.segments ? b.maxMemory : b.minMemory + (i * increment)
    console.log(`[${i+1}/${b.segments+1}] Benchmarking m = ${memory}`)

    // Benchmark the time required to initialize argon2-wasm and run argon2 twice
    const start = performance.now()
    const argon2 = new Argon2(b.simd ? wasm.argon2Simd : wasm.argon2)
    await argon2.instantiate()
    for (let run = 0; run < 2; run++) {
      const code = argon2.hashPassword({
        password: b.password,
        salt,
        timeCost: b.time,
        memoryCost: memory,
        parallelism: b.parallelism,
        hashLen: 32
      })
      if (code !== 0) {
        console.error(`Failed with code ${code}`)
        curve.save()
        break outer
      }
    }
    const elapsed = performance.now() - start
    console.log(`Done in ${(elapsed / 1000).toFixed(3)}s.\n`)
    curve.push(elapsed, memory)
  }
  curve.save()
}

await runBenchmark({
  time: 1,
  parallelism: 1,
  simd: false,
  password: 'samplepassword',

  minMemory: 10 * 1024,
  maxMemory: 1024 * 1024,

  segments: 10
})