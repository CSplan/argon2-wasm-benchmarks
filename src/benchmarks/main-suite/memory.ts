import { type Benchmark, BenchmarkTypes } from '../../benchmark.js'

export const memorySuite: Benchmark[] = [
  {
    type: BenchmarkTypes.Memory,
    memory: 1024,
    max: 1024 * 1024
  },
  {
    type: BenchmarkTypes.Memory,
    memory: 1024 * 1024,
    max: 2 * 1024 * 1024, // 2GiB is relevant as the max memory param CSplan allows
    segments: 5
  }
]