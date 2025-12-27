<div align="center">
  <h1>🌲 TemplateForest</h1>
  <p>A personal server application template with authentication, logging, and modern UI.</p>

  [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![Node](https://img.shields.io/badge/Node.js-≥24-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
  [![pnpm](https://img.shields.io/badge/pnpm-≥10-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
</div>

---

A best-practice template for building personal server applications. Provides a solid foundation with authentication, logging, and theming out of the box.

## Features

- **Authentication**: Password-based authentication with secure session management
- **Logging System**: Comprehensive logging with filtering, search, and retention policies
- **Modern UI**: React-based frontend with Material UI theming (light/dark/system)
- **Internationalization**: Built-in i18n support (Korean/English)
- **Type Safety**: Full TypeScript across frontend and backend
- **Database**: SQLite with Prisma ORM for simple deployment

## Tech Stack

### Backend

- **Fastify**: High-performance web server
- **Prisma + SQLite**: Type-safe database ORM with embedded database
- **Argon2**: Secure password hashing
- **TypeScript**: Full type safety

### Frontend

- **React 19**: Modern UI framework
- **Material UI (MUI)**: Component library
- **Zustand**: State management
- **i18next**: Internationalization
- **React Router**: Client-side routing

## Requirements

- Node.js 24 or later
- pnpm 10 or later

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/TemplateForest.git
cd TemplateForest

# Install dependencies
pnpm install
```

### Configuration

Create a `.env` file in the project root (optional):

```bash
# Server
HOST=127.0.0.1
PORT=4001
NODE_ENV=production

# Database
DATABASE_URL_SQLITE=file:./prisma/templateforest.db

# Session
SESSION_COOKIE=session
SESSION_TTL=24h

# Security
RATELIMIT_MAX=100
RATELIMIT_WINDOWMS=10s
```

### Database Setup

```bash
# Apply database migrations
pnpm db:deploy
```

### Development

```bash
# Run both backend and frontend in development mode
pnpm dev

# Or run separately
pnpm dev:backend
pnpm dev:frontend
```

### Production Build

```bash
# Build the application
pnpm build

# Start the server
pnpm start
```

Access the application at `http://127.0.0.1:4001`

## Project Structure

```
TemplateForest/
├── backend/              # Fastify backend server
│   ├── src/
│   │   ├── api/          # API routes
│   │   ├── config/       # Configuration
│   │   ├── database/     # Prisma client
│   │   ├── handlers/     # Error handlers
│   │   ├── middleware/   # Auth middleware
│   │   ├── services/     # Business logic
│   │   └── utils/        # Utilities
│   └── prisma/           # Database schema & migrations
├── frontend/             # React frontend
│   ├── src/
│   │   ├── api/          # API client
│   │   ├── components/   # React components
│   │   ├── locales/      # i18n translations
│   │   ├── pages/        # Page components
│   │   ├── stores/       # Zustand stores
│   │   └── theme/        # MUI theme
│   └── public/           # Static assets
├── types/                # Shared TypeScript types
└── package.json          # Workspace root
```

## Customization

### Adding New Pages

1. Create a new page component in `frontend/src/pages/`
2. Add the route in `frontend/src/App.tsx`
3. Add translations in `frontend/src/locales/`

### Adding New API Endpoints

1. Create a route file in `backend/src/api/`
2. Register the route in `backend/src/api/index.ts`
3. Add types in `types/src/`

### Database Changes

1. Update `backend/prisma/schema.prisma`
2. Run `pnpm db:dev` to create a migration
3. Update services as needed

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development servers |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format code with Prettier |
| `pnpm db:dev` | Create database migration |
| `pnpm db:deploy` | Apply migrations |
| `pnpm db:studio` | Open Prisma Studio |

## License

MIT License. See [LICENSE](LICENSE) for details.
