import {kv} from "attio/server"
import {documentStateChangedWebhookBodySchema} from "../../../../pandadoc/webhook-payload-schema"
import {verifyPandadocWebhookSignature} from "../../../../pandadoc/verify-webhook-signature"
import {createLogger} from "../../../../utils/logger"
import {processedEventKvKey, webhookSharedKeyKvKey} from "./kv-keys"
import {buildDocumentStatusChangedOutcome} from "./to-outcome"

// Matches PandaDoc's manual webhook-retry window.
const PROCESSED_EVENT_TTL_SECONDS = 60 * 60 * 24 * 15
const logger = createLogger("pandadoc document-status-changed trigger")

export async function handleDocumentStatusChangedTrigger(
    req: Request,
    {
        config,
        metadata,
    }: {config: {status: string; templateId?: string}; metadata: {uniqueActivationId: string}}
) {
    // req.url isn't guaranteed to be an absolute URL in this runtime — a base keeps the
    // parse working either way, we only need the query string.
    const signature = new URL(req.url, "http://localhost").searchParams.get("signature")

    const sharedKeyEntry = await kv.get(webhookSharedKeyKvKey(metadata.uniqueActivationId))
    const sharedKey = sharedKeyEntry?.value

    if (typeof sharedKey !== "string") {
        logger.error("No stored Pandadoc shared key for this activation")
        return {type: "no-op" as const}
    }

    const rawBody = await req.text()

    if (!(await verifyPandadocWebhookSignature({rawBody, signature, sharedKey}))) {
        logger.error("Invalid Pandadoc webhook signature")
        return {type: "no-op" as const}
    }

    // X-PandaDoc-Webhook-Event-Id is stable across retries of the same delivery.
    const eventId = req.headers.get("x-pandadoc-webhook-event-id")
    const eventKey = eventId ? processedEventKvKey(metadata.uniqueActivationId, eventId) : null

    if (eventKey) {
        const alreadyProcessed = await kv.get(eventKey)

        if (alreadyProcessed?.value === "processed") {
            return {type: "no-op" as const}
        }
    }

    let body: unknown
    try {
        body = JSON.parse(rawBody)
    } catch {
        logger.error("Failed to parse Pandadoc webhook payload as JSON")
        return {type: "no-op" as const}
    }

    const parsed = documentStateChangedWebhookBodySchema.safeParse(body)

    if (!parsed.success) {
        logger.error("Unexpected Pandadoc webhook payload shape", parsed.error)
        return {type: "no-op" as const}
    }

    const matchingEvents = parsed.data.filter(
        (event) =>
            event.event === "document_state_changed" &&
            event.data.status === config.status &&
            (!config.templateId || event.data.template?.id === config.templateId)
    )

    if (matchingEvents.length === 0) {
        return {type: "no-op" as const}
    }

    // A trigger callback can only start one run per delivery. If PandaDoc ever batches more
    // than one matching event into a single delivery, the rest are dropped here, and since the
    // whole delivery is marked processed below, even a manual re-fire from PandaDoc's webhook
    // history won't recover them. Logged so we can tell if this actually happens in practice.
    if (matchingEvents.length > 1) {
        logger.error(
            `Delivery contained ${matchingEvents.length} events matching status "${config.status}" — only the first starts a run`
        )
    }

    const matchingEvent = matchingEvents[0]

    const data = buildDocumentStatusChangedOutcome(matchingEvent.data)

    if (eventKey) {
        await kv.set(eventKey, "processed", {ttlInSeconds: PROCESSED_EVENT_TTL_SECONDS})
    }

    return {
        type: "outcome" as const,
        id: "triggered",
        data,
    }
}
