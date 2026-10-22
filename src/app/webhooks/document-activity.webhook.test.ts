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

const {logDocumentOpened} = vi.hoisted(() => ({logDocumentOpened: vi.fn()}))
vi.mock("../../activities/log-document-opened", () => ({logDocumentOpened}))

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

describe(documentActivityWebhook, () => {
    beforeEach(async () => {
        verifyPandadocWebhookSignature.mockReset()
        verifyPandadocWebhookSignature.mockResolvedValue(true)
        logDocumentOpened.mockReset()
        logDocumentOpened.mockResolvedValue(complete(undefined))
        await kv.set(ACTIVITY_WEBHOOK_SHARED_KEY_KV_KEY, "shared-key")
    })

    it("logs an opened activity only for documents that changed to viewed", async () => {
        const response = await documentActivityWebhook(
            buildRequest({
                body: [
                    stateChanged("document.viewed"),
                    stateChanged("document.completed"),
                    {event: "recipient_completed", data: {}},
                ],
                eventId: "evt-viewed",
            })
        )

        expect(response.status).toBe(200)
        expect(logDocumentOpened).toHaveBeenCalledTimes(1)
        expect(logDocumentOpened.mock.calls[0][0].document.id).toBe("doc-document.viewed")
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

        expect(logDocumentOpened.mock.calls[0][0].openedAt).toEqual(
            new Date("2026-09-25T11:21:03.518550Z")
        )
    })

    it("skips a delivery that was already processed", async () => {
        await kv.set(activityWebhookProcessedEventKvKey("evt-done"), "processed")

        const response = await documentActivityWebhook(
            buildRequest({body: [stateChanged("document.viewed")], eventId: "evt-done"})
        )

        expect(response.status).toBe(200)
        expect(logDocumentOpened).not.toHaveBeenCalled()
    })

    it("fails without marking the delivery processed when logging fails, so a retry logs it", async () => {
        logDocumentOpened.mockResolvedValueOnce(errored({code: "ATTIO_API_ERROR"}))

        const response = await documentActivityWebhook(
            buildRequest({body: [stateChanged("document.viewed")], eventId: "evt-failed"})
        )

        expect(response.status).toBe(500)
        expect(await kv.get(activityWebhookProcessedEventKvKey("evt-failed"))).toBeNull()
    })
})
