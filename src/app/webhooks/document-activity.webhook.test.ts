import {complete, errored} from "@attio/fetchable"
import {kv} from "attio/server"
import {beforeEach, describe, expect, it, vi} from "vitest"
import {
    ACTIVITY_WEBHOOK_SHARED_KEY_KV_KEY,
    activityWebhookProcessedEventKvKey,
} from "../../activities/activity-webhook"

const {verifyPandadocWebhookSignature} = vi.hoisted(() => ({
    verifyPandadocWebhookSignature: vi.fn(),
}))
vi.mock("../../pandadoc/verify-webhook-signature", () => ({verifyPandadocWebhookSignature}))

const {logDocumentActivity} = vi.hoisted(() => ({logDocumentActivity: vi.fn()}))
vi.mock("../../activities/log-document-activity", () => ({logDocumentActivity}))

const {logRecipientCompletedActivity} = vi.hoisted(() => ({
    logRecipientCompletedActivity: vi.fn(),
}))
vi.mock("../../activities/log-recipient-completed-activity", () => ({
    logRecipientCompletedActivity,
}))

import documentActivityWebhook from "./document-activity.webhook"

function buildRequest({body, eventId}: {body: unknown; eventId: string}): Request {
    return new Request("https://example.com/hook?signature=sig", {
        method: "POST",
        headers: {"x-pandadoc-webhook-event-id": eventId},
        body: JSON.stringify(body),
    })
}

const stateChanged = (status: string) => ({
    event: "document_state_changed",
    data: {
        id: `doc-${status}`,
        name: "Proposal",
        status,
        date_modified: "2026-09-25T11:21:03.518550Z",
    },
})

const recipientCompleted = {
    event: "recipient_completed",
    data: {
        id: "doc-1",
        name: "Proposal",
        status: "document.completed",
        date_modified: "2026-09-25T11:21:03.518550Z",
        recipients: [{email: "signer@example.com", recipient_type: "signer", roles: ["Client"]}],
        action_by: {email: "signer@example.com"},
        action_date: "2026-09-25T11:20:00.000000Z",
    },
}

describe(documentActivityWebhook, () => {
    beforeEach(async () => {
        verifyPandadocWebhookSignature.mockReset()
        verifyPandadocWebhookSignature.mockResolvedValue(true)
        logDocumentActivity.mockReset()
        logDocumentActivity.mockResolvedValue(complete(undefined))
        logRecipientCompletedActivity.mockReset()
        logRecipientCompletedActivity.mockResolvedValue(complete(undefined))
        await kv.set(ACTIVITY_WEBHOOK_SHARED_KEY_KV_KEY, "shared-key")
    })

    it.each([
        {status: "document.viewed", activitySlug: "pandadoc_document_opens"},
        {status: "document.declined", activitySlug: "pandadoc_document_declines"},
        {status: "document.completed", activitySlug: "pandadoc_document_completions"},
    ])(
        "logs a $activitySlug activity for a document that changed to $status",
        async ({status, activitySlug}) => {
            const response = await documentActivityWebhook(
                buildRequest({body: [stateChanged(status)], eventId: `evt-${status}`})
            )

            expect(response.status).toBe(200)
            expect(logDocumentActivity).toHaveBeenCalledTimes(1)
            expect(logDocumentActivity.mock.calls[0][0]).toMatchObject({
                activitySlug,
                document: {id: `doc-${status}`},
            })
        }
    )

    it("logs nothing for other statuses and events", async () => {
        const response = await documentActivityWebhook(
            buildRequest({
                body: [stateChanged("document.sent"), {event: "document_updated", data: {}}],
                eventId: "evt-ignored",
            })
        )

        expect(response.status).toBe(200)
        expect(logDocumentActivity).not.toHaveBeenCalled()
    })

    it("timestamps the activity with the document's date_modified", async () => {
        await documentActivityWebhook(
            buildRequest({
                body: [
                    {
                        event: "document_state_changed",
                        data: {
                            id: "doc-1",
                            name: "Proposal",
                            status: "document.viewed",
                            date_modified: "2026-09-25T11:21:03.518550Z",
                        },
                    },
                ],
                eventId: "evt-date-modified",
            })
        )

        expect(logDocumentActivity.mock.calls[0][0].occurredAt).toEqual(
            new Date("2026-09-25T11:21:03.518550Z")
        )
    })

    it("logs the recipient completed activity for a recipient_completed event", async () => {
        const response = await documentActivityWebhook(
            buildRequest({body: [recipientCompleted], eventId: "evt-recipient-completed"})
        )

        expect(response.status).toBe(200)
        expect(logRecipientCompletedActivity).toHaveBeenCalledWith(
            expect.objectContaining({id: "doc-1", action_by: {email: "signer@example.com"}})
        )
    })

    it("skips a delivery that was already processed", async () => {
        await kv.set(activityWebhookProcessedEventKvKey("evt-done"), "processed")

        const response = await documentActivityWebhook(
            buildRequest({body: [stateChanged("document.viewed")], eventId: "evt-done"})
        )

        expect(response.status).toBe(200)
        expect(logDocumentActivity).not.toHaveBeenCalled()
    })

    it("fails without marking the delivery processed when logging fails, so a retry logs it", async () => {
        logDocumentActivity.mockResolvedValueOnce(errored({code: "ATTIO_API_ERROR"}))

        const response = await documentActivityWebhook(
            buildRequest({body: [stateChanged("document.viewed")], eventId: "evt-failed"})
        )

        expect(response.status).toBe(500)
        expect(await kv.get(activityWebhookProcessedEventKvKey("evt-failed"))).toBeNull()
    })
})
