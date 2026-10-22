import {kv} from "attio/server"
import {ACTIVITY_WEBHOOK_SHARED_KEY_KV_KEY} from "../../activities/activity-webhook"
import {verifyPandadocWebhookSignature} from "../../pandadoc/verify-webhook-signature"
import {createLogger} from "../../utils/logger"

const logger = createLogger("pandadoc document-activity webhook")

export default async function documentActivityWebhook(req: Request): Promise<Response> {
    // req.url isn't guaranteed to be an absolute URL in this runtime, so parse it against a base.
    const signature = new URL(req.url, "http://localhost").searchParams.get("signature")

    const sharedKeyEntry = await kv.get(ACTIVITY_WEBHOOK_SHARED_KEY_KV_KEY)
    const sharedKey = sharedKeyEntry?.value

    if (typeof sharedKey !== "string") {
        logger.error("No stored PandaDoc shared key for the activity webhook")
        return new Response(null, {status: 401})
    }

    const rawBody = await req.text()

    if (!(await verifyPandadocWebhookSignature({rawBody, signature, sharedKey}))) {
        logger.error("Invalid PandaDoc webhook signature")
        return new Response(null, {status: 401})
    }

    return new Response(null, {status: 200})
}
