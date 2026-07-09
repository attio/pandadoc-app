# pandadoc

Attio app integrating with [PandaDoc](https://pandadoc.com) — document automation and e-signature.

## Overview

Create, send, and review PandaDoc documents without leaving Attio. The integration launches the PandaDoc document builder in an embedded iframe pre-filled from the current record, and surfaces the documents linked to a record — with their status — directly on the record page.

## Features

- **Create documents** — open the PandaDoc builder from a Deal, Person, or custom-object record, pre-populated with recipients and field tokens from that record.
- **View documents** — open the list of PandaDoc documents linked to the current record.
- **Document widgets** — a record widget shows each record's associated PandaDoc documents and their current status.
- **Multi-object support** — works across Deals, People, and custom objects.

## Setup

```bash
pnpm install
```

## Development

```bash
pnpm run dev
```

## Commands

| Command                 | Description              |
| ----------------------- | ------------------------ |
| `pnpm run dev`          | Start dev server         |
| `pnpm run build`        | Build + type-check       |
| `pnpm run lint`         | Run ESLint               |
| `pnpm run lint:fix`     | Run ESLint with auto-fix |
| `pnpm run format`       | Format with Prettier     |
| `pnpm run format:check` | Check formatting         |
| `pnpm run test`         | Run tests                |
| `pnpm run knip`         | Check for dead code      |

## Source folder structure

| Path                  | Description                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `src/app.ts`          | App manifest — registers record actions and record widgets.                                                         |
| `src/pandadoc/`       | PandaDoc REST API client, server-side document fetchers, and Zod schemas.                                           |
| `src/common/`         | Shared UI + logic: document list/widget components, the create-document iframe launcher, recipient parsing, status helpers. |
| `src/deals/`          | Deal record actions + widget and the GraphQL queries used to read deal data.                                        |
| `src/people/`         | Person record actions + widget and the GraphQL queries used to read person data.                                    |
| `src/custom-objects/` | Custom-object record actions + widget and the GraphQL queries used to read custom-object data.                      |
| `src/utils/`          | Shared helpers (casing, timestamp formatting, react-query setup, connection check) plus tests.                      |

See [AGENTS.md](./AGENTS.md) for full SDK usage notes and coding guidelines.
