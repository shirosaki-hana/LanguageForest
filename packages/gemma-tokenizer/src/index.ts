import { createRequire } from 'module';

export type GemmaBinding = {
  init(tokenizerDir: string): void;
  count(text: string): number;
};

const requireCompat = createRequire(import.meta.url);

type WasmModule = {
  init_from_json: (json: string) => void;
  count: (text: string) => number;
};

let wasmModule: WasmModule | null = null;
let initialized = false;

function ensureWasmModule(): WasmModule {
  if (wasmModule) return wasmModule;
  try {
    wasmModule = requireCompat('../pkg/gemma_tokenizer.js') as unknown as WasmModule;
    return wasmModule;
  } catch (e) {
    throw new Error('WASM package not found. Build with wasm-pack and include pkg/.');
  }
}

export const init = (tokenizerDir: string) => {
  const wasm = ensureWasmModule();
  const { readFileSync, existsSync, statSync } = requireCompat('fs') as typeof import('fs');
  const path = requireCompat('path') as typeof import('path');
  
  const jsonPath = existsSync(tokenizerDir) && statSync(tokenizerDir).isDirectory()
    ? path.join(tokenizerDir, 'tokenizer.json')
    : tokenizerDir;
  const json = readFileSync(jsonPath, 'utf-8');
  
  wasm.init_from_json(json);
  initialized = true;
};

export const count = (text: string) => {
  if (!initialized) throw new Error('Tokenizer not initialized. Call init() first.');
  const wasm = ensureWasmModule();
  return wasm.count(text);
};
