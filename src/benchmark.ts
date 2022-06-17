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

export enum BenchmarkTypes {
  Memory,
  Time,
  Parallelism
}

export type Benchmark = {
  /** The display name of the benchmark */
  name: string

  type: BenchmarkTypes
  // Constants (used as minimum value for the field being benchmarked)
  time?: number // Default 1
  parallelism?: number // Default 1
  memory?: number // in KiB, Default 128MB
  simd?: boolean // Default false

  // Max value of the field being benchmarked
  max: number

  // The resolution of the generated curve, equal to the number of tests to be run - 1
  segments?: number // Default 10
}

function assignDefaults(b: Benchmark): Required<Benchmark> {
  b.time = b.time ?? 1
  b.parallelism = b.parallelism ?? 1
  b.memory = b.memory ?? 1024 * 128
  b.simd = b.simd ?? false
  b.segments = b.segments ?? 10
  return b as Required<Benchmark>
}

export async function runBenchmark(benchmark: Benchmark): Promise<void> {
  // Assign default values
  const b: Required<Benchmark> = assignDefaults(benchmark)

  // Initialize the curve output
  let
    dir: string,
    file: string,
    variableHeader: string,
    min: number
  // Label the output curve using the constant values, and place it in a folder for the variable being measured
  switch (b.type) {
  case BenchmarkTypes.Memory:
    dir = `results/memory/t${b.time}_p${b.parallelism}`
    file = `${b.memory}-${b.max}`
    variableHeader = 'Memory Parameter (KiB)'
    min = b.memory
    break
  case BenchmarkTypes.Time:
    dir = `results/time/m${b.memory}_p${b.parallelism}`
    file = `${b.time}-${b.max}`
    variableHeader = 'Time Parameter (iterations)'
    min = b.time
    break
  case BenchmarkTypes.Parallelism:
    dir = `results/parallelism/t${b.time}_m${b.memory}`
    file = `${b.parallelism}-${b.max}`
    variableHeader = 'Parallelism Parameter (threads)'
    min = b.parallelism
    break
  }
  // Suffix with whether reference or SIMD memory handling is used
  if (b.simd) {
    file += '_simd'
  }

  
  const curve = new BenchmarkCurve(`${dir}/${file}.csv`, variableHeader)

  // Generate a random salt and password
  const salt = crypto.getRandomValues(new Uint8Array(16))

  const increment = Math.floor((b.max - min) / b.segments)
  outer:
  for (let i = 0; i <= b.segments; i++) {
    const v = i === b.segments ? b.max : min + (i * increment)
    console.log(`[${i+1}/${b.segments+1}] ${benchmarkMessage(v, b.type)}`)

    // Prepare parameters
    const params: Parameters<Argon2['hashPassword']>[0] = {
      password: randomPassword(20), 
      salt,
      timeCost: b.time,
      memoryCost: b.memory,
      parallelism: b.parallelism,
      hashLen: 32
    }

    // Set the variable being benchmarked
    switch (b.type) {
    case BenchmarkTypes.Memory:
      params.memoryCost = v
      break
    case BenchmarkTypes.Time:
      params.timeCost = v
      break
    case BenchmarkTypes.Parallelism:
      params.parallelism = v
    }

    // Benchmark the time required to initialize argon2-wasm and run argon2 twice
    const start = performance.now()
    const argon2 = new Argon2(b.simd ? wasm.argon2Simd : wasm.argon2)
    await argon2.instantiate()
    for (let run = 0; run < 2; run++) {
      const code = argon2.hashPassword(params)
      if (code !== 0) {
        console.error(`Failed with code ${code}`)
        curve.save()
        break outer
      }
    }
    const elapsed = performance.now() - start
    console.log(`Done in ${(elapsed / 1000).toFixed(3)}s.\n`)
    curve.push(elapsed, v)
  }
  curve.save()
}

// The message to be printed to the console for a benchmark
function benchmarkMessage(v: number, type: BenchmarkTypes): string {
  switch (type) {
  case BenchmarkTypes.Memory:
    return `m = ${v}`
  case BenchmarkTypes.Time:
    return `t = ${v}`
  case BenchmarkTypes.Parallelism:
    return `p = ${v}`
  }
}

function randomPassword(len: number): string {
  // Populate an array of [a-zA-Z0-9]
  const chars: string[] = Array(62)
  {
    const upperStart = 'A'.charCodeAt(0)
    const lowerStart = 'a'.charCodeAt(0)
    // Populate letters
    for (let i = 0; i < 26; i++) {
      chars[i] = String.fromCodePoint(upperStart + i)
      chars[i+26] = String.fromCodePoint(lowerStart + i)
    }
    // Populate numbers
    for (let i = 0; i < 10; i++) {
      chars[i+52] = i.toString()
    }
  }

  // Generate a random password
  let password = ''
  const rand = crypto.getRandomValues(new Uint8Array(len))
  for (let i = 0; i < len; i++) {
    password += chars[Math.floor((rand[i] / 255) * (chars.length - 1))] // Convert random number from 0-255 to 0-(chars.length - 1)
  }
  return password
}
