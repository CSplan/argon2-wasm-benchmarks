import { type WriteStream, createWriteStream, mkdirSync } from 'fs'
import { dirname } from 'path'

// Simple wrapper class over a csv file
export class BenchmarkCurve {
  private stream: WriteStream

  constructor(file: `${string}.csv`, ...headers: string[]) {
    const dir = dirname(file)
    mkdirSync(dir, {
      recursive: true
    })
    this.stream = createWriteStream(file, { flags: 'w' })
    // Add CSV headers
    this.stream.write(`${headers.join(', ')}\n`)
  }

  push(...data: unknown[]): void {
    this.stream.write(`${data.join(', ')}\n`)
  }

  /** Close the curve's output file. Must be called to save buffered output. */
  save(): void {
    this.stream.close()
  }
}