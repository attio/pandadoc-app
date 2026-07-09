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
- **GraphQL queries** — `.graphql` files read attribute values and associated people from the Attio record (deal attributes, person attributes, custom-object attributes, people-by-deal) to build recipients/tokens. Generated `*.graphql.d.ts` typings are produced by `attio build` and are gitignored.

> No webhook, workflow-block, or bulk-action entry points are registered. `src/app.ts` declares record actions and widgets; the `callRecording` section is present but empty.

## Source folder structure

| Path                  | Description                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `src/app.ts`          | App manifest — registers record actions and record widgets.                                                         |
| `src/pandadoc/`       | PandaDoc REST API client (`call-pandadoc-api.ts`), server-side document fetchers (`*.server.ts`), and Zod schemas.  |
| `src/common/`         | Shared UI + logic: the document list/widget components, the create-document iframe launcher, recipient parsing, and status colour/label helpers. |
| `src/deals/`          | Deal record action + widget entry points, deal metadata key, and the GraphQL queries used to read deal data.        |
| `src/people/`         | Person record action + widget entry points and the GraphQL queries used to read person data.                        |
| `src/custom-objects/` | Custom-object record action + widget entry points, metadata key, and the GraphQL queries used to read custom-object data. |
| `src/utils/`          | Shared helpers (camel→pascal casing, timestamp formatting, react-query setup, connection check) plus their tests.   |

## External service

- **Service:** PandaDoc (document automation / e-signature).
- **API:** REST — `https://api.pandadoc.com/public/v1` (docs: https://developers.pandadoc.com).
- **Auth:** user connection — calls send `Authorization: Bearer <connection.value>`, retrieved via `getUserConnection()` in `src/pandadoc/call-pandadoc-api.ts`.
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
- You SHOULD use console.error to capture information about unexpected errors.
- You MUST NOT log sensitive information such as email addresses or passwords.
- You MUST handle API errors gracefully. Do not throw an error within a React component, but instead return a clear fallback UI.
- When `getUserConnection()` / `getWorkspaceConnection()` is called, you MUST NOT wrap it in a try/catch. These functions throw special errors that power the connection dialogs in the UI.
- You SHOULD prefer named arguments over positional arguments when using 3 or more arguments.
- You MUST NOT use `any` when typing your code. Type errors MUST be fixed properly as usage of `any` is a likely source of bugs.
- You SHOULD order functions/values within code so that all values are defined before being used. Default export should go at the bottom of a file.

### App-specific guidelines

- PandaDoc API calls go through `src/pandadoc/call-pandadoc-api.ts`. PandaDoc documents are linked to Attio records by a metadata key (see `*-metadata-key.ts` per object) — keep the key construction in sync between the create flow (iframe metadata) and the fetch-by-metadata server queries, or widgets will not find their documents.
- The three supported objects (Deals, People, custom objects) deliberately mirror each other: each has a `create-document-action`, a `view-documents-action`, a `documents-widget`, and its own GraphQL queries. When changing one object's flow, check whether the other two need the same change.
- GraphQL `.graphql` files compile to gitignored `*.graphql.d.ts` typings via `attio build`. Run `pnpm run build` after adding or editing a query before relying on its generated types.

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
