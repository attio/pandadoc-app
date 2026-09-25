import {type AsyncResult, complete, errored} from "@attio/fetchable"
import {getUserConnection, getWorkspaceConnection} from "attio/server"
import {createLogger} from "../utils/logger"
import {type PandadocApiError, readPandadocApiError} from "./error"

const logger = createLogger("pandadoc client API")

export type {PandadocApiError} from "./error"

// errored(...) on any non-2xx HTTP response or transport failure.
// Callers only need isErrored() to handle all failures.
type PandadocApiResponse<T> = {
    statusCode: number
    data: T | undefined
}

type Connection = "user-connection" | "workspace-connection"

async function request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    url: string,
    options?: {body?: unknown; connection?: Connection}
): AsyncResult<PandadocApiResponse<T>, PandadocApiError> {
    // getUserConnection()/getWorkspaceConnection() throw a special error that powers the
    // connection dialog in the UI — it must propagate, not be swallowed by the try/catch below.
    const resolvedConnection =
        options?.connection === "workspace-connection"
            ? await getWorkspaceConnection()
            : await getUserConnection()

    try {
        // Both the user and workspace connections are PandaDoc OAuth tokens.
        const headers: Record<string, string> = {
            Authorization: `Bearer ${resolvedConnection.value}`,
        }

        const init: RequestInit = {method, headers}

        if (options?.body !== undefined) {
            headers["Content-Type"] = "application/json"
            init.body = JSON.stringify(options.body)
        }

        const response = await fetch(url, init)

        logger.log(`${method} ${url} (${response.status})`)

        if (!response.ok) {
            return errored(await readPandadocApiError(response, `${method} ${url}`))
        }

        // Treats an empty body and an unparseable one the same way — either way there's no data,
        // and a resource function's own schema parse will catch a shape that's wrong rather than
        // merely absent.
        const data = (await response.json().catch(() => undefined)) as T | undefined

        return complete({statusCode: response.status, data})
    } catch (error) {
        const message = error instanceof Error ? error.message : "unknown_error"

        logger.error(message)

        return errored({code: "NETWORK_ERROR", detail: message})
    }
}

async function get<T>(
    url: string,
    connection?: Connection
): AsyncResult<PandadocApiResponse<T>, PandadocApiError> {
    return request<T>("GET", url, {connection})
}

async function post<T>(
    url: string,
    options?: {body?: unknown; connection?: Connection}
): AsyncResult<PandadocApiResponse<T>, PandadocApiError> {
    return request<T>("POST", url, options)
}

async function put<T>(
    url: string,
    options?: {body?: unknown; connection?: Connection}
): AsyncResult<PandadocApiResponse<T>, PandadocApiError> {
    return request<T>("PUT", url, options)
}

async function del<T>(
    url: string,
    connection?: Connection
): AsyncResult<PandadocApiResponse<T>, PandadocApiError> {
    return request<T>("DELETE", url, {connection})
}

export const pandadocApi = {
    get,
    post,
    put,
    delete: del,
}
