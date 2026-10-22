import {isErrored} from "@attio/fetchable"
import {kv} from "attio/server"
import {
    ACTIVITY_WEBHOOK_SHARED_KEY_KV_KEY,
    activityWebhookProcessedEventKvKey,
} from "../../activities/activity-webhook"
import {logDocumentOpened} from "../../activities/log-document-opened"
import {verifyPandadocWebhookSignature} from "../../pandadoc/verify-webhook-signature"
import {
    mixedEventsWebhookBodySchema,
    webhookDocumentSchema,
    type WebhookDocument,
} from "../../pandadoc/webhook-payload-schema"
import {createLogger} from "../../utils/logger"

// PandaDoc keeps failed deliveries for 15 days, and they can be retried by hand during that time.
// @see https://support.pandadoc.com/en/articles/webhooks
const PROCESSED_EVENT_TTL_SECONDS = 60 * 60 * 24 * 15
const logger = createLogger("pandadoc document-activity webhook")

function openedDocuments(events: {event: string; data: unknown}[]): WebhookDocument[] {
    return events.flatMap((event) => {
        if (event.event !== "document_state_changed") {
            return []
        }

        const document = webhookDocumentSchema.safeParse(event.data)

        if (!document.success) {
            logger.error("Unexpected PandaDoc document_state_changed payload", document.error)
            return []
        }

        return document.data.status === "document.viewed" ? [document.data] : []
    })
}

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

    // A retry carries the same X-PandaDoc-Webhook-Event-Id as the original delivery.
    // @see https://developers.pandadoc.com/docs/webhook-deduplication
    const eventId = req.headers.get("x-pandadoc-webhook-event-id")
    const eventKey = eventId ? activityWebhookProcessedEventKvKey(eventId) : null

    if (eventKey && (await kv.get(eventKey))?.value === "processed") {
        return new Response(null, {status: 200})
    }

    let body: unknown
    try {
        body = JSON.parse(rawBody)
    } catch {
        logger.error("Failed to parse PandaDoc webhook payload as JSON")
        return new Response(null, {status: 400})
    }

    const parsed = mixedEventsWebhookBodySchema.safeParse(body)

    if (!parsed.success) {
        logger.error("Unexpected PandaDoc webhook payload shape", parsed.error)
        return new Response(null, {status: 400})
    }

    // A delivery is an array that may hold more than one event.
    // @see https://developers.pandadoc.com/docs/webhook-setup#limits
    for (const document of openedDocuments(parsed.data)) {
        // date_modified tracked each status change in tested deliveries, and unlike the delivery
        // time it isn't delayed by retries.
        const result = await logDocumentOpened({
            document,
            openedAt: new Date(document.date_modified),
        })

        // Not marked processed, so PandaDoc's retry of this delivery can log it.
        if (isErrored(result)) {
            logger.error("Failed to log a PandaDoc document open", {
                code: result.error.code,
            })
            return new Response(null, {status: 500})
        }
    }

    if (eventKey) {
        await kv.set(eventKey, "processed", {ttlInSeconds: PROCESSED_EVENT_TTL_SECONDS})
    }

    return new Response(null, {status: 200})
}
