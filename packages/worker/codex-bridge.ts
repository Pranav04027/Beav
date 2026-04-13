// codex-bridge.ts — the whole protocol layer
import { spawn } from "child_process"

type JsonRpcRequest = {
  jsonrpc: "2.0"
  id: number
  method: string
  params: Record<string, unknown>
}

type JsonRpcResponse = {
  jsonrpc: "2.0"
  id: number
  result?: unknown
  error?: { code: number; message: string }
}

export class CodexBridge {
  private pending = new Map<number, (r: JsonRpcResponse) => void>()
  private nextId = 1
  private proc = spawn("codex", ["--pipe"]) // spawns Codex CLI in pipe mode

  constructor() {
    // every line from stdout is a JSON-RPC response
    let buffer = ""
    this.proc.stdout.on("data", (chunk: Buffer) => {
      buffer += chunk.toString()
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""           // keep incomplete line
      for (const line of lines) {
        if (!line.trim()) continue
        const response: JsonRpcResponse = JSON.parse(line)
        this.pending.get(response.id)?.(response)
        this.pending.delete(response.id)
      }
    })
  }

  // send a request and wait for its matching response
  call(method: string, params: Record<string, unknown>): Promise<unknown> {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, (r) => {
        if (r.error) reject(new Error(r.error.message))
        else resolve(r.result)
      })
      const request: JsonRpcRequest = { jsonrpc: "2.0", id, method, params }
      this.proc.stdin.write(JSON.stringify(request) + "\n")
    })
  }
}