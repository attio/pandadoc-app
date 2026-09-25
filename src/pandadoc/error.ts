import {complete, errored, type Result} from "@attio/fetchable"
import type {z, ZodError} from "zod"
import {createLogger} from "../utils/logger"
import {InvalidSchemaError} from "../utils/schema-error"

// No HTTP status codes leak out past this file — callers switch on `code` instead.
type PandadocErrorCode =
    | "UNAUTHORIZED" // 401 — missing/invalid/expired credentials, fixed by reconnecting
    | "FORBIDDEN" // 403 — authenticated, but the key lacks a scope/permission
    | "NOT_FOUND" // 404
    | "RATE_LIMITED" // 429
    | "SERVICE_API_ERROR" // 5xx from PandaDoc
    | "INVALID_REQUEST" // other 4xx
    | "NETWORK_ERROR" // transport failure, no HTTP response received
    | "UNEXPECTED_ERROR" // invalid/unexpected response body

export type PandadocApiError = {
    code: PandadocErrorCode
    detail: string | null
}

const logger = createLogger("pandadoc API error")

function schemaParseError(detail: string | ZodError): PandadocApiError {
    logger.error(
        typeof detail === "string"
            ? new Error(`Unexpected PandaDoc API response: ${detail}`)
            : new InvalidSchemaError(detail)
    )

    return {code: "UNEXPECTED_ERROR", detail: null}
}

/** Validates `data` against `schema`, mapping a failure through `schemaParseError`. */
export function parseWith<TSchema extends z.ZodType>(
    schema: TSchema,
    data: unknown
): Result<z.output<TSchema>, PandadocApiError> {
    const parsed = schema.safeParse(data)

    return parsed.success ? complete(parsed.data) : errored(schemaParseError(parsed.error))
}

function codeForStatus(status: number): PandadocErrorCode {
    switch (status) {
        case 401:
            return "UNAUTHORIZED"
        case 403:
            return "FORBIDDEN"
        case 404:
            return "NOT_FOUND"
        case 429:
            return "RATE_LIMITED"
        default:
            return status >= 500 ? "SERVICE_API_ERROR" : "INVALID_REQUEST"
    }
}

async function readErrorBody(response: Response): Promise<unknown> {
    const bodyText = await response.text().catch(() => null)

    if (!bodyText?.trim()) {
        return null
    }

    try {
        return JSON.parse(bodyText) as unknown
    } catch {
        return bodyText
    }
}

/** Pulls PandaDoc's own wording out of a failed response, for `PandadocApiError.detail`. */
function getApiErrorDetail(errorBody: unknown): string | null {
    if (typeof errorBody === "string" && errorBody.trim()) {
        return errorBody.trim()
    }

    if (typeof errorBody === "object" && errorBody !== null) {
        if (
            "detail" in errorBody &&
            typeof errorBody.detail === "string" &&
            errorBody.detail.trim()
        ) {
            return errorBody.detail.trim()
        }

        if (
            "message" in errorBody &&
            typeof errorBody.message === "string" &&
            errorBody.message.trim()
        ) {
            return errorBody.message.trim()
        }
    }

    return null
}

export async function readPandadocApiError(
    response: Response,
    requestLabel?: string
): Promise<PandadocApiError> {
    const code = codeForStatus(response.status)
    const detail = getApiErrorDetail(await readErrorBody(response))

    logger.error(
        `${requestLabel ? `${requestLabel} ` : ""}failed (${response.status})${detail ? `: ${detail}` : ""}`
    )

    return {code, detail}
}

export function pandadocErrorMessage(error: PandadocApiError): string {
    switch (error.code) {
        case "UNAUTHORIZED":
            return "PandaDoc authentication failed. Reconnect PandaDoc and try again."
        case "FORBIDDEN":
            return "Your PandaDoc connection doesn't have permission for this. Reconnect PandaDoc with the required permissions and try again."
        case "NOT_FOUND":
            return "PandaDoc could not find the requested resource."
        case "RATE_LIMITED":
            return "PandaDoc rate limit exceeded. Please try again later."
        case "SERVICE_API_ERROR":
            return "PandaDoc service temporarily unavailable. Please try again later."
        case "INVALID_REQUEST":
        case "NETWORK_ERROR":
        case "UNEXPECTED_ERROR":
            return "An unexpected error occurred when calling PandaDoc's API."
    }
}
