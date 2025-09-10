# ASH AI - Apparel Smart Hub

A comprehensive ERP system for apparel manufacturing built with Next.js 15, TypeScript, and Prisma.

## Quick Start

```bash
npm install
npm run dev
```

## Documentation

- [Project Documentation](./docs/README.md)
- [Development Guide](./docs/CLAUDE.md)
- [Client Updates](./docs/CLIENT_UPDATED_PLAN.md)

## Project Structure

```
├── src/                 # Source code
├── prisma/             # Database schema and migrations
├── docs/               # Documentation
├── config/             # Configuration files
├── public/             # Static assets
└── scripts/            # Build and deployment scripts
```

## Development

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Database
npx prisma db push
npx prisma studio
```

## Environment Setup

Copy configuration files from `config/` directory:
- `.env.example` -> `.env`
- `.env.production` for production deployment