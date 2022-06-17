import { runBenchmark } from '../../benchmark.js'
import { memorySuite } from './memory.js'

for (const benchmark of memorySuite) {
  await runBenchmark(benchmark)
}