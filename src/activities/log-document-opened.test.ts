import {complete, errored} from "@attio/fetchable"
import {beforeEach, describe, expect, it, vi} from "vitest"

const {attioClient} = vi.hoisted(() => ({attioClient: {post: vi.fn()}}))
vi.mock("../attio/client", () => ({attioClient}))

import {logDocumentOpened} from "./log-document-opened"

const openedAt = new Date("2026-09-25T10:00:00.000Z")

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

const recipientReference = (ifUnmatched: "create" | "ignore") => ({
    target_object: "people",
    target_record_reference: {
        match: {email_addresses: "signer@example.com"},
        if_unmatched: ifUnmatched,
    },
})

describe(logDocumentOpened, () => {
    beforeEach(() => {
        attioClient.post.mockReset()
        attioClient.post.mockResolvedValue(complete({}))
    })

    it("links the deal, the custom-object record and a person for each recipient", async () => {
        await logDocumentOpened({
            document: {
                ...document,
                metadata: {"attio.deal_id": "deal-1", "attio.custom_object": "projects.rec-1"},
            },
            openedAt,
        })

        expect(postedLinkedRecords()).toEqual([
            {target_object: "deals", target_record_id: "deal-1"},
            {target_object: "projects", target_record_id: "rec-1"},
            recipientReference("create"),
        ])
    })

    it("links only existing people when Attio rejects creating that many", async () => {
        attioClient.post.mockResolvedValueOnce(errored({code: "LIMIT_REACHED"}))

        const result = await logDocumentOpened({document, openedAt})

        expect(result).toEqual(complete(undefined))
        expect(attioClient.post).toHaveBeenCalledTimes(2)
        expect(postedLinkedRecords(0)).toEqual([recipientReference("create")])
        expect(postedLinkedRecords(1)).toEqual([recipientReference("ignore")])
    })

    it("returns any other write error without trying again", async () => {
        attioClient.post.mockResolvedValueOnce(errored({code: "INVALID_REQUEST"}))

        const result = await logDocumentOpened({document, openedAt})

        expect(result).toEqual(errored({code: "INVALID_REQUEST"}))
        expect(attioClient.post).toHaveBeenCalledTimes(1)
    })

    it("writes nothing when the document has no linked record or recipient", async () => {
        const result = await logDocumentOpened({document: {...document, recipients: []}, openedAt})

        expect(result).toEqual(complete(undefined))
        expect(attioClient.post).not.toHaveBeenCalled()
    })
})
