# LanguageForest

AI-powered translation desktop application built with Electron and React.

## Features

- AI-powered translation using Google Gemini API
- Chunk-based translation for long documents
- Multiple prompt templates for different translation styles
- Real-time translation progress tracking
- Session management for organizing translation projects
- Support for custom dictionaries

## Tech Stack

- **Framework**: Electron + React
- **Build Tool**: electron-vite
- **UI**: Material-UI (MUI)
- **State Management**: Zustand
- **Database**: SQLite (node:sqlite)
- **ORM**: Kysely
- **Language**: TypeScript
- **i18n**: i18next

## Project Structure

```
src/
├── main/           # Electron main process
│   ├── config/     # Configuration (models, etc.)
│   ├── database/   # SQLite database layer
│   ├── external/   # External API clients (Gemini)
│   ├── ipc/        # IPC handlers
│   ├── services/   # Business logic
│   ├── translation/# Translation utilities
│   └── utils/      # Utilities
├── preload/        # Preload scripts (contextBridge)
├── renderer/       # React application
│   └── src/
│       ├── api/        # IPC API wrappers
│       ├── components/ # React components
│       ├── pages/      # Page components
│       ├── stores/     # Zustand stores
│       └── locales/    # i18n translations
└── shared/         # Shared types and schemas
    └── types/
```

## Development

### Prerequisites

- Node.js 22.5.0+ (for native SQLite support)
- pnpm

### Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Build Windows installer
pnpm build:win
```

### Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production
- `pnpm build:win` - Build Windows installer (NSIS)
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier
- `pnpm typecheck` - Run TypeScript type checking

## Configuration

### Gemini API Key

The application requires a Google Gemini API key to function. You can set it in the Settings dialog within the app.

### Prompt Templates

Translation prompt templates are stored in the `prompt/` directory as `.chatml` files. Each template includes:
- Frontmatter with metadata (title, source/target language)
- ChatML-formatted prompt content with Handlebars templating

## License

MIT
