import { createWriteStream, type WriteStream } from 'fs'

// Simple wrapper class over a csv file
export class BenchmarkCurve {
  private stream: WriteStream

  constructor(file: `${string}.csv`) {
    this.stream = createWriteStream(file, { flags: 'w' })
  }

  push(time: number, value: number): void {
    this.stream.write(`${time}, ${value}\n`)
  }

  /** Close the curve's output file. Must be called to save buffered output. */
  save(): void {
    this.stream.close()
  }
}