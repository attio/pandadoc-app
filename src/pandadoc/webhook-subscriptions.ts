import {type AsyncResult, complete, isErrored, map} from "@attio/fetchable"
import {createLogger} from "../utils/logger"
import {type PandadocApiError, pandadocApi} from "./client"
import {endpoints} from "./endpoints"
import {parseWith} from "./error"
import {webhookSubscriptionResponseSchema} from "./schemas"

const logger = createLogger("pandadoc webhook subscriptions")

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
}: {
    name: string
    url: string
}): AsyncResult<PandadocWebhookSubscription, PandadocApiError> {
    const responseResult = await pandadocApi.post(endpoints.webhookSubscriptions, {
        body: {name, url, triggers: ["document_state_changed"], active: true},
        connection: "workspace-connection",
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
export async function deleteWebhookSubscription(id: string): AsyncResult<void, PandadocApiError> {
    const responseResult = await pandadocApi.delete(
        endpoints.webhookSubscription(id),
        "workspace-connection"
    )

    if (isErrored(responseResult)) {
        return responseResult
    }

    return complete(undefined)
}
