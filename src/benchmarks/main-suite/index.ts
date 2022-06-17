import { runBenchmark } from '../../benchmark.js'
import time from './time.js'

for (const benchmark of time) {
  console.log(`Running Benchmark '${benchmark.name}'`)
  await runBenchmark(benchmark)
}