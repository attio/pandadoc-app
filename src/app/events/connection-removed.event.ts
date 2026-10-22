import type {Connection} from "attio/server"
import {removeActivityWebhooks} from "../../activities/activity-webhook"
import {createLogger} from "../../utils/logger"

const logger = createLogger("connection-removed")

export default async function connectionRemoved({connection}: {connection: Connection}) {
    if (connection.ownedBy.type !== "workspace") {
        return
    }

    try {
        await removeActivityWebhooks(connection)
    } catch (error) {
        logger.error("Failed to remove the PandaDoc activity webhook", error)
    }
}
