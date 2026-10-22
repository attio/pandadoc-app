import type {Connection} from "attio/server"
import {registerActivityWebhook} from "../../activities/activity-webhook"
import {ensureActivities} from "../../activities/ensure-activities"
import {createLogger} from "../../utils/logger"

const logger = createLogger("connection-added")

/** How long setup can run before it's cancelled, so connecting PandaDoc doesn't time out. */
const SETUP_TIMEOUT_MS = 25_000

export default async function connectionAdded({connection}: {connection: Connection}) {
    if (connection.ownedBy.type !== "workspace") {
        return
    }

    const signal = AbortSignal.timeout(SETUP_TIMEOUT_MS)

    let isWebhookRegistered = false

    try {
        isWebhookRegistered = await registerActivityWebhook(connection, signal)
    } catch (error) {
        logger.error("Failed to register the PandaDoc activity webhook", error)
    }

    // The timeout fired before the webhook finished registering. Without the webhook no activity
    // is ever logged, so fail rather than save the connection.
    if (!isWebhookRegistered && signal.aborted) {
        throw new Error("Timed out registering the PandaDoc activity webhook")
    }

    // A timeout here only cancels the activities still being set up. Reconnecting creates them.
    try {
        await ensureActivities(signal)
    } catch (error) {
        logger.error("Failed to set up PandaDoc activities", error)
    }
}
