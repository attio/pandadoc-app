import {isErrored} from "@attio/fetchable"
import {kv, Workflows} from "attio/server"
import {pandadocErrorMessage} from "../../../pandadoc/error"
import {createWebhookSubscription} from "../../../pandadoc/webhook-subscriptions"
import block from "./block"
import {webhookSharedKeyKvKey, webhookSubscriptionIdKvKey} from "./lib/kv-keys"

export default Workflows.defineWorkflowBlockActivate(block, async ({metadata}) => {
    const {uniqueActivationId, triggerCallbackUrl} = metadata

    const result = await createWebhookSubscription({
        name: `Attio - Document status changed (${uniqueActivationId})`,
        url: triggerCallbackUrl,
    })

    if (isErrored(result)) {
        return {
            type: "error",
            errorMessage: `Could not register a PandaDoc webhook for this trigger. ${pandadocErrorMessage(result.error)}`,
        }
    }

    await kv.set(webhookSubscriptionIdKvKey(uniqueActivationId), result.value.id)
    await kv.set(webhookSharedKeyKvKey(uniqueActivationId), result.value.sharedKey)

    return {type: "complete"}
})
