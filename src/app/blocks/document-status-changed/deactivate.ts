import {isErrored} from "@attio/fetchable"
import {kv, Workflows} from "attio/server"
import {pandadocErrorMessage} from "../../../pandadoc/error"
import {deleteWebhookSubscription} from "../../../pandadoc/webhook-subscriptions"
import block from "./block"
import {webhookSharedKeyKvKey, webhookSubscriptionIdKvKey} from "./lib/kv-keys"

export default Workflows.defineWorkflowBlockDeactivate(block, async ({metadata}) => {
    const {uniqueActivationId} = metadata
    const idEntry = await kv.get(webhookSubscriptionIdKvKey(uniqueActivationId))
    const subscriptionId = idEntry?.value

    if (typeof subscriptionId === "string") {
        const result = await deleteWebhookSubscription(subscriptionId)

        // A 404 means the subscription is already gone, which is fine for an idempotent delete.
        if (isErrored(result) && result.error.code !== "NOT_FOUND") {
            return {
                type: "error",
                errorMessage: `Could not remove the PandaDoc webhook registered for this trigger. ${pandadocErrorMessage(result.error)}`,
            }
        }
    }

    await kv.delete(webhookSubscriptionIdKvKey(uniqueActivationId))
    await kv.delete(webhookSharedKeyKvKey(uniqueActivationId))

    return {type: "complete"}
})
