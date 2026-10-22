import type {Connection} from "attio/server"
import {registerActivityWebhook} from "../../activities/activity-webhook"
import {ensureActivities} from "../../activities/ensure-activities"
import {createLogger} from "../../utils/logger"

const logger = createLogger("connection-added")

export default async function connectionAdded({connection}: {connection: Connection}) {
    if (connection.ownedBy.type !== "workspace") {
        return
    }

    try {
        await ensureActivities()
    } catch (error) {
        logger.error("Failed to set up PandaDoc activities", error)
    }

    try {
        await registerActivityWebhook(connection)
    } catch (error) {
        logger.error("Failed to register the PandaDoc activity webhook", error)
    }
}
