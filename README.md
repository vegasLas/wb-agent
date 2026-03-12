# WB Monorepo

An Nx-powered monorepo with Vue 3 frontend and Express backend.

## Tech Stack

### Frontend
- **Vue 3** - Progressive JavaScript framework
- **TypeScript** - Type-safe JavaScript
- **Pinia** - State management
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Build tool

### Backend
- **Express** - Node.js web framework
- **TypeScript** - Type-safe JavaScript

### Monorepo
- **Nx** - Smart, fast and extensible build system

## Getting Started

### Install dependencies
```bash
npm install
```

### Development

Run both frontend and backend:
```bash
npm run dev
```

Or run individually:
```bash
# Frontend only
npm run dev:frontend

# Backend only
npm run dev:backend
```

### Build
```bash
npm run build
```

### Lint
```bash
npm run lint
```

### Test
```bash
npm run test
```

## Project Structure

```
wb-monorepo/
├── apps/
│   ├── frontend/          # Vue 3 application
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── stores/    # Pinia stores
│   │   │   └── main.ts
│   │   └── package.json
│   ├── frontend-e2e/      # Playwright e2e tests
│   └── backend/           # Express application
│       ├── src/
│       │   └── main.ts
│       └── package.json
├── tailwind.config.js     # Tailwind CSS config
├── postcss.config.js      # PostCSS config
└── nx.json                # Nx configuration
```

## API Endpoints

The backend exposes the following endpoints:

- `GET /api/health` - Health check
- `GET /api/hello` - Hello message

## License
MIT
# wb-agent
