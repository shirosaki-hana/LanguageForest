# @novelforest/gemma-tokenizer
 - WASM-powered Gemma tokenizer for Node.js

- API
  - `init(tokenizerDir: string): void` – initialize with directory containing `tokenizer.json`
  - `count(text: string): number` – count tokens

## Build

Build the WASM module once:

```bash
cd packages/gemma-tokenizer
wasm-pack build --release --target nodejs -d pkg
pnpm run build
```

## Usage

```javascript
import { init, count } from '@novelforest/gemma-tokenizer';

// Initialize with tokenizer directory or JSON file
init('./path/to/tokenizer');

// Count tokens
console.log(count('Hello world!')); // 3
```

## Development

```bash
# Build WASM (Rust 툴체인 필요)
pnpm -C packages/gemma-tokenizer exec wasm-pack build --release --target nodejs -d pkg

# Build TypeScript
pnpm -C packages/gemma-tokenizer run build

# Test
node -e "import('./packages/gemma-tokenizer/dist/index.js').then(m=>{m.init('./packages/gemma-tokenizer/tokenizer'); console.log('count=', m.count('hello world test'));})"
```
