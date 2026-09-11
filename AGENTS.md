# AGENTS.md

This file provides guidance to AI agents who are working on the code in this repository.

## Context

This repository contains an app built with the Attio App SDK.

### What the app does

PandaDoc integration for Attio. It lets users create, send, and review PandaDoc documents directly from Attio record pages. From a Deal, Person, or custom-object record a user can launch the PandaDoc document builder (rendered in an embedded iframe, pre-filled with recipients and field tokens drawn from the record), and a record widget lists the PandaDoc documents already associated with that record along with their status. Documents are linked back to Attio records via PandaDoc metadata, so each record's widget shows only its own documents.

### What is the App SDK?

The App SDK is a set of components and functionality to build apps that are embedded directly in the Attio CRM platform.

#### App SDK capabilities

- Use React to render components provided by the `attio/client` package.
- Run server-side code and make API calls to external services using `.server.ts` files.
- Store API tokens using the connections system.
- Receive incoming requests from third-party services via webhooks.
- Subscribe to events e.g. connection.added
- Manage form rendering, validation and submission with `useForm()`.
- Manage data fetching and async caching with `useAsyncCache()` and `useQuery()`.

## App SDK entry points in use

- **Record actions** — for each supported object (Deals, People, custom objects) there are two actions:
  - `create-document-action` — opens the PandaDoc document builder in an embedded iframe, pre-populating recipients and field tokens from the current record.
  - `view-documents-action` — opens the list of PandaDoc documents linked to the current record.
- **Record widgets** — `documents-widget` (one per supported object) renders, inside the record page, the PandaDoc documents associated with that record and their status.
- **Workflow trigger block** — `document-status-changed` (`src/app/blocks/document-status-changed/`) starts a workflow run when a PandaDoc document changes to a status the workspace member picks from a dropdown ("Completed", "Viewed", "Declined", "Sent", "Voided" — see `src/pandadoc/document-status-options.ts`). It registers one workspace-wide PandaDoc webhook subscription on activation (optionally filtered to one template) and exposes the document id/name, recipient emails, PandaDoc's own `date_completed`/`date_modified` fields as-is (not a derived "this is when it happened" value — `date_modified` is a generic last-modified timestamp, not scoped to any one status transition), and — when present — the linked Deal id or custom-object slug/record id parsed from the document's metadata.
- **GraphQL queries** — `.graphql` files read attribute values and associated people from the Attio record (deal attributes, person attributes, custom-object attributes, people-by-deal) to build recipients/tokens. Generated `*.graphql.d.ts` typings are produced by `attio build` and are gitignored.

> No webhook handler (`src/app/webhooks/`) or bulk-action entry points are registered — PandaDoc has no workspace-wide events to react to outside of the workflow trigger above, which receives its callbacks directly via the trigger block's own callback URL rather than a shared `.webhook.ts` handler.

## Source folder structure

| Path                  | Description                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `src/app/blocks/document-status-changed/` | Workflow trigger block. `block.ts` declares the `status`/`templateId` config; `activate.ts`/`deactivate.ts` manage the PandaDoc webhook subscription; `trigger.ts` verifies the signature, de-dupes deliveries, and matches the configured status; `lib/to-outcome.ts` maps a webhook document to the outcome shape; `lib/kv-keys.ts` namespaces its `kv` entries. |
| `src/app/server-functions/` | Thin `*.server.ts` bridges between client-side callers (extensions, configurators) and `src/pandadoc/`'s `AsyncResult`-returning functions — catch and log failures, returning a safe fallback rather than throwing (see API clients below). |
| `src/pandadoc/`       | PandaDoc REST API integration: `client.ts` (the `fetch` wrapper, returns `@attio/fetchable` `AsyncResult`s), `error.ts` (semantic error mapping), `endpoints.ts` (URL builders), one file per resource (`contacts.ts`, `documents.ts`, `templates.ts`, `webhook-subscriptions.ts`), the incoming webhook payload schema (`webhook-payload-schema.ts`), signature verification (`verify-webhook-signature.ts`), the list of statuses offered as trigger options (`document-status-options.ts`), and `schemas.ts` (Zod). |
| `src/common/`         | Shared UI + logic: the document list/widget components, the create-document iframe launcher, recipient parsing, and status colour/label helpers. |
| `src/deals/`          | Deal record action + widget entry points, deal metadata key, and the GraphQL queries used to read deal data.        |
| `src/people/`         | Person record action + widget entry points and the GraphQL queries used to read person data.                        |
| `src/custom-objects/` | Custom-object record action + widget entry points, metadata key, and the GraphQL queries used to read custom-object data. |
| `src/utils/`          | Shared helpers (camel→pascal casing, timestamp formatting, react-query setup, connection check, the shared logger, Zod error formatting) plus their tests.   |

## External service

- **Service:** PandaDoc (document automation / e-signature).
- **API:** REST — `https://api.pandadoc.com/public/v1` (docs: https://developers.pandadoc.com).
- **Auth:** mixed. Document/contact calls use the user connection (`getUserConnection()`), matching who's acting on the record; PandaDoc treats this as an OAuth token, so these calls send `Authorization: Bearer <connection.value>`. Template listing and webhook-subscription calls (used by the trigger block's configurator and webhook lifecycle) use the workspace connection (`getWorkspaceConnection()`) instead, since the trigger block doesn't require a user connection and PandaDoc webhook subscriptions are workspace-scoped resources that shouldn't depend on one specific user's connection staying valid — that connection holds a PandaDoc API key, not an OAuth token, so `client.ts` sends it as `Authorization: API-Key <connection.value>`. The two schemes are not interchangeable; don't unify them. `pandadocApi` in `src/pandadoc/client.ts` takes a `connection: "user-connection" | "workspace-connection"` option (defaults to user) to pick between them.
- **Document builder:** rendered via `showIframe` from a hosted embed (`https://pandadoc.attio-embedded-apps.com`), which posts messages back to the app for recipients/tokens and close events.

## Environment

Code for the app may run either in a client-side or server-side context.

### Client-side code

Client-side code runs in the browser. However, it runs inside a safe sandbox, using a custom JS runtime. This means that:

- You MUST NOT render HTML tags directly e.g. `<div>Hello</div>`. Instead, you MUST only use components provided by the App SDK.
- You MUST NOT use custom styles or CSS. Only use the pre-styled components provided by the App SDK.
- You MUST NOT try to read the DOM directly.
- Some browser APIs may not be available.
- `fetch` calls are not allowed. You MUST NOT call `fetch` directly and should instead use `fetch` via server-side functions.

Files which render React components MUST use the `.tsx` extension.

### Server-side code

Server-side code runs in files ending in:

- `.server.ts`
- `.webhook.ts`
- `.event.ts`

Workflow block files will also run in the server (excluding configurators).

Code that any of the above files import will also run in a server-side environment.

Server-side code DOES NOT run in Node.js but instead in a custom JS runtime. While many Node.js APIs are supported, some are not and you may need to factor this into your decision to use certain packages.

## Using the Attio App SDK

Attio provides three packages to help you build apps:

1. `attio/client` - for client-side imports
2. `attio/server` - for server-side imports
3. `attio` - for shared/environment-agnostic imports

IMPORTANT: Before importing from these packages, you MUST always check one of the following to confirm that your import is correct:

1. Existing examples in the codebase
2. TypeScript type definitions and JSDoc strings for the package
3. The Attio SDK documentation

If you are unsure about an import, always check explicitly and do not guess.

## Coding guidelines

- You SHOULD use Zod to validate data from public APIs.
- You SHOULD only include properties in Zod schemas that we explicitly need.
- You SHOULD use try/catch around calls to `.json()`.
- You SHOULD use the shared logger (`src/utils/logger.ts`, `createLogger(prefix)`) to capture information about unexpected errors, rather than raw `console.error`.
- You MUST NOT log sensitive information such as email addresses or passwords.
- You MUST handle API errors gracefully. Do not throw an error within a React component, but instead return a clear fallback UI.
- When `getUserConnection()` / `getWorkspaceConnection()` is called, you MUST NOT wrap it in a try/catch. These functions throw special errors that power the connection dialogs in the UI.
- You SHOULD prefer named arguments over positional arguments when using 3 or more arguments.
- You MUST NOT use `any` when typing your code. Type errors MUST be fixed properly as usage of `any` is a likely source of bugs.
- You SHOULD order functions/values within code so that all values are defined before being used. Default export should go at the bottom of a file.

### API clients

- All PandaDoc API calls go through `src/pandadoc/client.ts` (`pandadocApi.get/post/put/delete`), which returns a `@attio/fetchable` `AsyncResult` — never call `fetch` against PandaDoc directly, and never let raw HTTP status codes leak out of `error.ts`. `PandadocApiError.code` is a semantic code (`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `RATE_LIMITED`, ...), not an HTTP status — `401` and `403` map to distinct codes since a missing scope (`403`) isn't fixed by reconnecting the same credentials (`401`) is. `pandadocErrorMessage(error)` builds the fixed, user-facing string per code; call it from the caller that needs a message (see `activate.ts`/`deactivate.ts`) rather than inventing a new string inline.
- Add a new resource under `src/pandadoc/<resource>.ts` (see `contacts.ts`/`documents.ts`), following the reference pattern in `scripts/template/AGENTS.md`: resolve the connection, call `pandadocApi`, then validate the response with `parseWith(schema, data)` (in `error.ts`) — it runs `safeParse` and maps a failure through `schemaParseError` for you, so use `map`/`bind` on the result rather than a manual `safeParse`/`if`.
- Client-side callers (React Query hooks, configurators) can't call an `AsyncResult`-returning function directly — wrap it in a thin `*.server.ts` controller under `src/app/server-functions/`. There's no `ErrorBoundary` anywhere in this app (or any app in the monorepo), so a thrown error from a `useSuspenseQuery` callback has nothing to catch it gracefully — on `isErrored(result)`, log and return a safe fallback (e.g. `[]`) instead of throwing, matching `get-documents-by-emails.server.ts` and lemlist's `server-functions/` convention.
- `getUserConnection()`/`getWorkspaceConnection()` in `client.ts` are called outside the try/catch, not inside it — wrapping them swallows the special error that powers the connection dialog in the UI.

### App-specific guidelines

- PandaDoc documents are linked to Attio records by a metadata key (see `*-metadata-key.ts` per object) — keep the key construction in sync between the create flow (iframe metadata) and the fetch-by-metadata server queries, or widgets will not find their documents.
- The three supported objects (Deals, People, custom objects) deliberately mirror each other: each has a `create-document-action`, a `view-documents-action`, a `documents-widget`, and its own GraphQL queries. When changing one object's flow, check whether the other two need the same change.
- GraphQL `.graphql` files compile to gitignored `*.graphql.d.ts` typings via `attio build`. Run `pnpm run build` after adding or editing a query before relying on its generated types.
- `src/app/blocks/<id>/` folders are auto-discovered by the CLI, and every direct subfolder of `src/app/blocks/` is required to have its own `block.ts` — the build fails otherwise.
- `document-status-changed` is a single trigger block covering every PandaDoc document status we expose, rather than one block per status (unlike e.g. Linear's `issue-created`/`issue-updated`/`issue-deleted`). This mirrors PandaDoc's own webhook API, which delivers all status transitions through one `document_state_changed` event — one webhook subscription and one block, filtered client-side by the workspace member's chosen `status`, the same shape as lemlist's `lemlist-activity` trigger. To offer another status as a trigger option, add it to `DOCUMENT_STATUSES`/`DOCUMENT_STATUS_LABELS` in `src/pandadoc/document-status-options.ts` — don't add another block folder.
- The trigger creates one PandaDoc webhook subscription per workflow activation (`src/pandadoc/webhook-subscriptions.ts`, workspace connection) and stores the subscription id and per-subscription shared key in `kv` (`lib/kv-keys.ts`). `trigger.ts` verifies the `signature` query-param PandaDoc appends to the callback URL against that shared key (`src/pandadoc/verify-webhook-signature.ts`) before trusting the payload — never skip that check. It also de-dupes deliveries by the `X-PandaDoc-Webhook-Event-Id` header (PandaDoc retries failed deliveries automatically, and users can manually re-fire one from their webhook history for up to 15 days), so a retried delivery can't start a second workflow run for the same event; the delivery is only marked processed once an outcome has actually been built, so a failure partway through leaves it eligible for a real retry. The optional `templateId` config filters client-side, since PandaDoc's webhook subscriptions can't be scoped server-side to one template. People aren't included in the trigger's output because, unlike Deals/custom objects, PandaDoc documents for People aren't tagged with a record-id metadata key (they're matched to a Person only by recipient email at read time); if that changes, revisit the outcome fields too.

### Error messages (user-facing)

- Never dump raw JSON, HTTP status codes, or square brackets in UI error messages.
- Never expose transport-layer details — say "An unexpected error occurred when calling PandaDoc's API" not "503 from PandaDoc".
- Auth errors MUST tell the user how to fix the connection (e.g. reconnect PandaDoc, or check that the API key is valid).

### Testing

- Where appropriate, use Vitest to run tests.
- Aim to implement unit testing where it helps increase confidence in the correctness of code.
- Do not test React components using react testing library or similar.
- When passing functions/classes to describe, pass the value directly, do not specify a name in quotes e.g. `describe(myFn, () => {/* ... */})`, not `describe("myFn", () => {/* ... */})`.

## Validation

- You MUST validate all your changes using the commands provided in package.json.
- Run and fix lint rules: `pnpm run lint:fix`
- Validate unused code: `pnpm run knip`
- Run tests: `pnpm run test`
- Validate the build: `pnpm run build`
