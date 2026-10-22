import {type AsyncResult, complete, isErrored, map} from "@attio/fetchable"
import type {Connection} from "attio/server"
import {createLogger} from "../utils/logger"
import {type PandadocApiError, pandadocApi} from "./client"
import {endpoints} from "./endpoints"
import {parseWith} from "./error"
import {webhookSubscriptionResponseSchema} from "./schemas"

const logger = createLogger("pandadoc webhook subscriptions")

type PandadocWebhookTrigger = "document_state_changed" | "recipient_completed"

export type PandadocWebhookSubscription = {
    id: string
    sharedKey: string
}

/**
 * @see https://developers.pandadoc.com/reference/create-webhooks-subscription
 */
export async function createWebhookSubscription({
    name,
    url,
    triggers,
    connection = "workspace-connection",
    signal,
}: {
    name: string
    url: string
    triggers: PandadocWebhookTrigger[]
    connection?: "workspace-connection" | Connection
    signal?: AbortSignal
}): AsyncResult<PandadocWebhookSubscription, PandadocApiError> {
    const responseResult = await pandadocApi.post(endpoints.webhookSubscriptions, {
        // PandaDoc leaves metadata out of deliveries unless it's requested here, and the
        // Attio record ids are stored in it.
        body: {name, url, triggers, active: true, payload: ["metadata"]},
        connection,
        signal,
    })

    if (isErrored(responseResult)) {
        logger.error("Failed to create webhook subscription", {error: responseResult.error})
        return responseResult
    }

    return map(
        parseWith(webhookSubscriptionResponseSchema, responseResult.value.data),
        (parsed) => ({id: parsed.uuid, sharedKey: parsed.shared_key})
    )
}

/**
 * @see https://developers.pandadoc.com/reference/delete-webhooks-subscription
 */
export async function deleteWebhookSubscription(
    id: string,
    connection: "workspace-connection" | Connection = "workspace-connection",
    signal?: AbortSignal
): AsyncResult<void, PandadocApiError> {
    const responseResult = await pandadocApi.delete(
        endpoints.webhookSubscription(id),
        connection,
        signal
    )

    if (isErrored(responseResult)) {
        return responseResult
    }

    return complete(undefined)
}
