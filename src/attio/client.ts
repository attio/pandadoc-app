import {type AsyncResult, complete, errored, fromPromise, isErrored} from "@attio/fetchable"
import {ATTIO_API_TOKEN} from "attio/server"
import type {z} from "zod"

import {createLogger} from "../utils/logger"
import type {AttioApiError} from "./error"

const logger = createLogger("attio client")

async function readErrorMessage(response: Response): Promise<string> {
    try {
        const body = (await response.json()) as unknown
        if (
            typeof body === "object" &&
            body !== null &&
            "message" in body &&
            typeof body.message === "string"
        ) {
            return body.message
        }
    } catch {
        // fall through to default
    }
    return `HTTP ${response.status}`
}

function httpStatusToAttioApiError(status: number): AttioApiError {
    switch (status) {
        case 400:
        case 422:
            return {code: "INVALID_REQUEST"}
        case 401:
            return {code: "UNAUTHORIZED"}
        case 403:
            return {code: "FORBIDDEN"}
        case 404:
            return {code: "NOT_FOUND"}
        case 409:
            return {code: "CONFLICT"}
        case 429:
            return {code: "RATE_LIMITED"}
        default:
            return status >= 500 ? {code: "ATTIO_API_ERROR"} : {code: "UNEXPECTED_ERROR"}
    }
}

async function attioRequest(
    method: "GET" | "POST",
    url: string,
    schema: z.ZodType | undefined,
    body?: unknown
): AsyncResult<unknown, AttioApiError> {
    const response = await fromPromise(
        fetch(url, {
            method,
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${ATTIO_API_TOKEN}`,
                ...(body !== undefined ? {"Content-Type": "application/json"} : {}),
            },
            body: body !== undefined ? JSON.stringify(body) : undefined,
        })
    )

    if (isErrored(response)) {
        logger.error(`Failed to ${method} ${url}: ${response.error}`)
        return errored({code: "UNEXPECTED_ERROR"})
    }

    const httpResponse = response.value

    logger.log(`${method} ${url} (${httpResponse.status})`)

    if (httpResponse.status === 404) {
        return errored({code: "NOT_FOUND"})
    }

    if (!httpResponse.ok) {
        const error = httpStatusToAttioApiError(httpResponse.status)
        const message = await readErrorMessage(httpResponse)
        logger.error(
            `${method} ${url} failed with ${httpResponse.status} (${error.code}): ${message}`
        )
        return errored(error)
    }

    let json: unknown
    try {
        json = await httpResponse.json()
    } catch {
        logger.error(`Invalid JSON from ${method} ${url}`)
        return errored({code: "UNEXPECTED_ERROR"})
    }

    if (schema === undefined) {
        return complete(json)
    }

    const parsed = schema.safeParse(json)
    if (!parsed.success) {
        logger.error(`Unexpected response shape from ${method} ${url}`, parsed.error)
        return errored({code: "UNEXPECTED_ERROR"})
    }

    return complete(parsed.data)
}

function get(url: string): AsyncResult<unknown, AttioApiError>
function get<TSchema extends z.ZodType>(
    url: string,
    schema: TSchema
): AsyncResult<z.infer<TSchema>, AttioApiError>
function get(url: string, schema?: z.ZodType): AsyncResult<unknown, AttioApiError> {
    return attioRequest("GET", url, schema)
}

function post(url: string, body: unknown): AsyncResult<unknown, AttioApiError>
function post<TSchema extends z.ZodType>(
    url: string,
    body: unknown,
    schema: TSchema
): AsyncResult<z.infer<TSchema>, AttioApiError>
function post(url: string, body: unknown, schema?: z.ZodType): AsyncResult<unknown, AttioApiError> {
    return attioRequest("POST", url, schema, body)
}

export const attioClient = {get, post}
