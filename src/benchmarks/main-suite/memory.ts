import { type Benchmark, BenchmarkTypes } from '../../benchmark.js'

export const memorySuite: Benchmark[] = [
  {
    name: 'Memory 1MB-1GB',
    type: BenchmarkTypes.Memory,
    memory: 1024,
    max: 1024 * 1024
  },
  {
    name: 'Memory 1GB-2GB',
    type: BenchmarkTypes.Memory,
    memory: 1024 * 1024,
    max: 2 * 1024 * 1024, // 2GiB is relevant as the max memory param CSplan allows
    segments: 5
  }
]