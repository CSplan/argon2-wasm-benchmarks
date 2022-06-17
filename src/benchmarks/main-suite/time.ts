import { BenchmarkTypes, type Benchmark } from '../../benchmark.js'

const benchmarks: Benchmark[] = [
  {
    name: 'Time 1-10 @ Memory = 32MB, Parallelism = 1',
    type: BenchmarkTypes.Time,
    time: 1,
    max: 10,
    memory: 32 * 1024
  },
  {
    name: 'Time 1-10 @ Memory = 128MB, Parallelism = 1',
    type: BenchmarkTypes.Time,
    time: 1,
    max: 10,
    memory: 128 * 1024
  },
  {
    name: 'Time 1-10 @ Memory = 1GB, Parallelism = 1',
    type: BenchmarkTypes.Time,
    time: 1,
    max: 10,
    memory: 1024 * 1024
  }
]

export default benchmarks