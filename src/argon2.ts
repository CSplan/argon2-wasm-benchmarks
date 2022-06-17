import { Argon2 as Argon2Types } from '@very-amused/argon2-wasm'

/** @copyright 2022 Keith Scroggs, argon2-wasm (argon2.ts) */
type Argon2Exports = {
    malloc(size: number): number
    free(ptr: number): void
    argon2i_hash_raw(t_cost: number, m_cost: number, parallelism: number, pwd: number, pwdlen: number, salt: number, saltlen: number, hash: number, hashlen: number): number
    memory: WebAssembly.Memory
}

/** @copyright 2022 Keith Scroggs, argon2-wasm (worker.ts) */
function zeroMemory(view: Uint8Array, passes = 3): void {
  for (let i = 0; i < passes; i++) {
    for (let j = 0; j < view.length; j++) {
      view[j] = 0x00
    }
  }
}

function copyMemory(dest: Uint8Array, src: Uint8Array, len: number): void {
  for (let i = 0; i < len; i++) {
    dest[i] = src[i]
  }
}

export class Argon2 {
  private source: Buffer
  private argon2!: Argon2Exports
  private results: Uint8Array[] = []

  constructor(source: Buffer) {
    this.source = source
  }

  /** Instantiate an argon2-wasm instance. */
  async instantiate(): Promise<void> {
    const opts = {
      env: {
        emscripten_notify_memory_growth() { // Placeholder function needed to instantiate without crashing
        }
      }
    }
    const { instance } = await WebAssembly.instantiate(this.source, opts)
    this.argon2 = instance.exports as Argon2Exports
  }

  /**
   * 
   * @returns The result code from argon2.
   */
  hashPassword(options: Argon2Types.Parameters & { parallelism: number }): number {
    const argon2 = this.argon2
    // Copy the salt into the argon2 buffer
    const saltLen = options.salt.byteLength
    const saltPtr = argon2.malloc(saltLen)
    let saltView = new Uint8Array(argon2.memory.buffer, saltPtr, saltLen)
    copyMemory(saltView, options.salt, saltLen)

    // Encode the password as bytes (the password should already be normalized)
    const encoded = new TextEncoder().encode(options.password)
    // Copy the encoded password into the argon2 buffer
    const passwordLen = encoded.byteLength
    const passwordPtr = argon2.malloc(passwordLen)
    let passwordView = new Uint8Array(argon2.memory.buffer, passwordPtr, passwordLen)
    copyMemory(passwordView, encoded, passwordLen)
    // Overwrite the encoded password in js memory
    zeroMemory(encoded)
  
    // Allocate memory for the hash (result)
    const hashLen = options.hashLen
    const hashPtr = argon2.malloc(hashLen)

    // Run argon2i
    const code = argon2.argon2i_hash_raw(
      options.timeCost,
      options.memoryCost,
      options.parallelism,
      passwordPtr,
      passwordLen,
      saltPtr,
      saltLen,
      hashPtr,
      hashLen
    )

    // Zero and free the password and salt from wasm memory (views have to be re-initialized because the wasm buffer growing destroys existing views)
    passwordView = new Uint8Array(argon2.memory.buffer, passwordPtr, passwordLen)
    zeroMemory(passwordView)
    argon2.free(passwordPtr)
    saltView = new Uint8Array(argon2.memory.buffer, saltPtr, saltLen)
    zeroMemory(saltView)
    argon2.free(saltPtr)
    // Zero the value-passed copy of the salt from the parameters
    zeroMemory(options.salt)

    // Copy the hash into JS memory
    const hash = new Uint8Array(hashLen)
    const hashView = new Uint8Array(argon2.memory.buffer, hashPtr, hashLen)
    copyMemory(hash, hashView, hashLen)
    // Zero and free the hash from wasm memory
    zeroMemory(hashView)
    argon2.free(hashPtr)

    // Store the hash in the result array, to be zeroed when the benchmark is complete
    this.results.push(hash)
    return code
  }
}