import {complete, errored} from "@attio/fetchable"
import {beforeEach, describe, expect, it, vi} from "vitest"

const {attioClient} = vi.hoisted(() => ({attioClient: {post: vi.fn()}}))
vi.mock("../attio/client", () => ({attioClient}))

import {logDocumentActivity} from "./log-document-activity"

const occurredAt = new Date("2026-09-25T10:00:00.000Z")

const document = {
    id: "doc-1",
    name: "Proposal",
    status: "document.viewed",
    date_modified: "2026-09-25T11:21:03.518550Z",
    recipients: [{email: "signer@example.com"}],
}

const postedLinkedRecords = (call = 0) =>
    (attioClient.post.mock.calls[call][1] as {data: {values: {linked_records: unknown}}}).data
        .values.linked_records

const postedValues = (call = 0) =>
    (attioClient.post.mock.calls[call][1] as {data: {values: Record<string, unknown>}}).data.values

const recipientReference = (ifUnmatched: "create" | "ignore") => ({
    target_object: "people",
    target_record_reference: {
        match: {email_addresses: "signer@example.com"},
        if_unmatched: ifUnmatched,
    },
})

const senderReference = {
    target_object: "people",
    target_record_reference: {
        match: {email_addresses: "sender@example.com"},
        if_unmatched: "create",
    },
}

const sent = {
    activitySlug: "pandadoc_document_sends",
    document: {...document, status: "document.sent"},
    occurredAt,
    sentByEmail: "sender@example.com",
}

describe(logDocumentActivity, () => {
    beforeEach(() => {
        attioClient.post.mockReset()
        attioClient.post.mockResolvedValue(complete({}))
    })

    it("links the deal, the custom-object record and a person for each recipient", async () => {
        await logDocumentActivity({
            document: {
                ...document,
                metadata: {"attio.deal_id": "deal-1", "attio.custom_object": "projects.rec-1"},
            },
            activitySlug: "pandadoc_document_opens",
            occurredAt,
        })

        expect(postedLinkedRecords()).toEqual([
            {target_object: "deals", target_record_id: "deal-1"},
            {target_object: "projects", target_record_id: "rec-1"},
            recipientReference("create"),
        ])
    })

    it("links only existing people when Attio rejects creating that many", async () => {
        attioClient.post.mockResolvedValueOnce(errored({code: "LIMIT_REACHED"}))

        const result = await logDocumentActivity({
            activitySlug: "pandadoc_document_opens",
            document,
            occurredAt,
        })

        expect(result).toEqual(complete(undefined))
        expect(attioClient.post).toHaveBeenCalledTimes(2)
        expect(postedLinkedRecords(0)).toEqual([recipientReference("create")])
        expect(postedLinkedRecords(1)).toEqual([recipientReference("ignore")])
    })

    it("links the sender first and references them as sent by", async () => {
        await logDocumentActivity(sent)

        expect(postedValues().linked_records).toEqual([
            senderReference,
            recipientReference("create"),
        ])
        expect(postedValues().sent_by).toEqual([senderReference])
    })

    it("links a sender who is also a recipient once", async () => {
        await logDocumentActivity({
            ...sent,
            document: {...sent.document, recipients: [{email: "Sender@example.com"}]},
        })

        expect(postedValues().linked_records).toEqual([senderReference])
    })

    it("writes no sent by without a sender", async () => {
        await logDocumentActivity({activitySlug: "pandadoc_document_opens", document, occurredAt})

        expect(postedValues()).not.toHaveProperty("sent_by")
    })

    it("still creates the sender when Attio rejects creating that many", async () => {
        attioClient.post.mockResolvedValueOnce(errored({code: "LIMIT_REACHED"}))

        await logDocumentActivity(sent)

        expect(postedValues(1).linked_records).toEqual([
            senderReference,
            recipientReference("ignore"),
        ])
        expect(postedValues(1).sent_by).toEqual([senderReference])
    })

    it("returns any other write error without trying again", async () => {
        attioClient.post.mockResolvedValueOnce(errored({code: "INVALID_REQUEST"}))

        const result = await logDocumentActivity({
            activitySlug: "pandadoc_document_opens",
            document,
            occurredAt,
        })

        expect(result).toEqual(errored({code: "INVALID_REQUEST"}))
        expect(attioClient.post).toHaveBeenCalledTimes(1)
    })

    it("writes nothing when the document has no linked record or recipient", async () => {
        const result = await logDocumentActivity({
            activitySlug: "pandadoc_document_opens",
            document: {...document, recipients: []},
            occurredAt,
        })

        expect(result).toEqual(complete(undefined))
        expect(attioClient.post).not.toHaveBeenCalled()
    })
})
