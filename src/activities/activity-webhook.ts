import {isErrored} from "@attio/fetchable"
import {
    createWebhookHandler,
    deleteWebhookHandler,
    kv,
    listWebhookHandlers,
    updateWebhookHandler,
    type Connection,
} from "attio/server"
import {
    createWebhookSubscription,
    deleteWebhookSubscription,
} from "../pandadoc/webhook-subscriptions"
import {createLogger} from "../utils/logger"

const logger = createLogger("pandadoc activity webhook")

const ACTIVITY_WEBHOOK_FILE_NAME = "document-activity"

/** One subscription per workspace, so its shared key lives under a single key. */
export const ACTIVITY_WEBHOOK_SHARED_KEY_KV_KEY = "pandadoc-activity-webhook-shared-key"

/** KV key marking an activity webhook delivery (by its X-PandaDoc-Webhook-Event-Id) as handled. */
export const activityWebhookProcessedEventKvKey = (eventId: string): string =>
    `pandadoc-activity-webhook-processed-event:${eventId}`

/**
 * Deletes every activity webhook handler and the PandaDoc subscription behind it. Failures are
 * logged, not returned, so a subscription PandaDoc already dropped can't block the rest.
 */
export async function removeActivityWebhooks(
    connection: Connection,
    signal?: AbortSignal
): Promise<void> {
    const handlers = (await listWebhookHandlers()).filter(
        (handler) => handler.fileName === ACTIVITY_WEBHOOK_FILE_NAME
    )

    for (const handler of handlers) {
        if (handler.externalWebhookId !== null) {
            const result = await deleteWebhookSubscription(
                handler.externalWebhookId,
                connection,
                signal
            )

            // A 404 means the subscription is already gone.
            if (isErrored(result) && result.error.code !== "NOT_FOUND") {
                logger.error("Failed to delete a PandaDoc activity webhook subscription")
            }
        }

        await deleteWebhookHandler(handler.id)
    }

    await kv.delete(ACTIVITY_WEBHOOK_SHARED_KEY_KV_KEY)
}

/**
 * Registers the activity webhook and its PandaDoc subscription, returning whether it succeeded.
 * `signal` cancels its PandaDoc requests, so a registration still running when it aborts stops.
 */
export async function registerActivityWebhook(
    connection: Connection,
    signal?: AbortSignal
): Promise<boolean> {
    await removeActivityWebhooks(connection, signal)

    const handler = await createWebhookHandler({fileName: ACTIVITY_WEBHOOK_FILE_NAME})

    const result = await createWebhookSubscription({
        name: "Attio - Document activity",
        url: handler.url,
        triggers: ["document_state_changed", "recipient_completed"],
        connection,
        signal,
    })

    if (isErrored(result)) {
        logger.error("Failed to create the PandaDoc activity webhook subscription")
        await deleteWebhookHandler(handler.id)
        return false
    }

    await kv.set(ACTIVITY_WEBHOOK_SHARED_KEY_KV_KEY, result.value.sharedKey)
    await updateWebhookHandler(handler.id, {externalWebhookId: result.value.id})

    return true
}
