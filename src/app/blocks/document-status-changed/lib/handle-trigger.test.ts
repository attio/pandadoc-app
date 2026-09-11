import {kv} from "attio/server"
import {beforeEach, describe, expect, it, vi} from "vitest"
import {processedEventKvKey, webhookSharedKeyKvKey} from "./kv-keys"

const {verifyPandadocWebhookSignature} = vi.hoisted(() => ({
    verifyPandadocWebhookSignature: vi.fn(),
}))

vi.mock("../../../../pandadoc/verify-webhook-signature", () => ({verifyPandadocWebhookSignature}))

import {handleDocumentStatusChangedTrigger} from "./handle-trigger"

const uniqueActivationId = "act-1"

function buildRequest({
    signature,
    body,
    eventId,
}: {
    signature?: string
    body: unknown
    eventId?: string
}): Request {
    const url = signature
        ? `https://example.com/hook?signature=${signature}`
        : "https://example.com/hook"

    return new Request(url, {
        method: "POST",
        headers: eventId ? {"x-pandadoc-webhook-event-id": eventId} : undefined,
        body: JSON.stringify(body),
    })
}

const baseConfig = {status: "document.completed"}

describe(handleDocumentStatusChangedTrigger, () => {
    beforeEach(async () => {
        verifyPandadocWebhookSignature.mockReset()
        await kv.set(webhookSharedKeyKvKey(uniqueActivationId), "shared-key")
    })

    it("returns no-op when the signature is invalid", async () => {
        verifyPandadocWebhookSignature.mockResolvedValueOnce(false)

        const result = await handleDocumentStatusChangedTrigger(
            buildRequest({signature: "sig", body: []}),
            {config: baseConfig, metadata: {uniqueActivationId}}
        )

        expect(result).toEqual({type: "no-op"})
    })

    it("returns no-op for an already-processed event id", async () => {
        verifyPandadocWebhookSignature.mockResolvedValueOnce(true)
        await kv.set(processedEventKvKey(uniqueActivationId, "evt-1"), "processed")

        const result = await handleDocumentStatusChangedTrigger(
            buildRequest({signature: "sig", body: [], eventId: "evt-1"}),
            {config: baseConfig, metadata: {uniqueActivationId}}
        )

        expect(result).toEqual({type: "no-op"})
    })

    it("returns no-op when the event status doesn't match the configured status", async () => {
        verifyPandadocWebhookSignature.mockResolvedValueOnce(true)

        const body = [
            {
                event: "document_state_changed",
                data: {id: "doc-1", name: "Doc", status: "document.viewed", recipients: []},
            },
        ]

        const result = await handleDocumentStatusChangedTrigger(
            buildRequest({signature: "sig", body, eventId: "evt-2"}),
            {config: baseConfig, metadata: {uniqueActivationId}}
        )

        expect(result).toEqual({type: "no-op"})
    })

    it("returns the outcome for a matching event and marks it processed", async () => {
        verifyPandadocWebhookSignature.mockResolvedValueOnce(true)

        const body = [
            {
                event: "document_state_changed",
                data: {id: "doc-1", name: "Doc", status: "document.completed", recipients: []},
            },
        ]

        const result = await handleDocumentStatusChangedTrigger(
            buildRequest({signature: "sig", body, eventId: "evt-3"}),
            {config: baseConfig, metadata: {uniqueActivationId}}
        )

        expect(result).toEqual({
            type: "outcome",
            id: "triggered",
            data: expect.objectContaining({document_id: "doc-1"}),
        })

        const marked = await kv.get(processedEventKvKey(uniqueActivationId, "evt-3"))
        expect(marked?.value).toBe("processed")
    })

    it("returns the outcome for a document with no template, sent as template: null", async () => {
        verifyPandadocWebhookSignature.mockResolvedValueOnce(true)

        const body = [
            {
                event: "document_state_changed",
                data: {
                    id: "doc-1",
                    name: "Doc",
                    status: "document.completed",
                    recipients: [],
                    template: null,
                },
            },
        ]

        const result = await handleDocumentStatusChangedTrigger(
            buildRequest({signature: "sig", body, eventId: "evt-4"}),
            {config: baseConfig, metadata: {uniqueActivationId}}
        )

        expect(result).toEqual({
            type: "outcome",
            id: "triggered",
            data: expect.objectContaining({document_id: "doc-1"}),
        })
    })

    it("fires using the first event and logs when a delivery has more than one match", async () => {
        verifyPandadocWebhookSignature.mockResolvedValueOnce(true)
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

        const body = [
            {
                event: "document_state_changed",
                data: {id: "doc-1", name: "First", status: "document.completed", recipients: []},
            },
            {
                event: "document_state_changed",
                data: {id: "doc-2", name: "Second", status: "document.completed", recipients: []},
            },
        ]

        const result = await handleDocumentStatusChangedTrigger(
            buildRequest({signature: "sig", body, eventId: "evt-5"}),
            {config: baseConfig, metadata: {uniqueActivationId}}
        )

        expect(result).toEqual({
            type: "outcome",
            id: "triggered",
            data: expect.objectContaining({document_id: "doc-1"}),
        })
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining("Delivery contained 2 events matching")
        )

        consoleErrorSpy.mockRestore()
    })
})
