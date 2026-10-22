import {complete, errored} from "@attio/fetchable"
import {beforeEach, describe, expect, it, vi} from "vitest"

const {attioClient} = vi.hoisted(() => ({attioClient: {post: vi.fn()}}))
vi.mock("../attio/client", () => ({attioClient}))

import {logRecipientCompletedActivity} from "./log-recipient-completed-activity"

const completedBy = {
    id: "doc-1",
    name: "Proposal",
    status: "document.completed",
    date_modified: "2026-09-25T11:21:03.518550Z",
    metadata: {"attio.deal_id": "deal-1"},
    recipients: [
        {email: "other@example.com", recipient_type: "cc", roles: []},
        {email: "Signer@example.com", recipient_type: "signer", roles: ["Client"]},
    ],
    action_by: {email: "signer@example.com"},
    action_date: "2026-09-25T11:20:00.000000Z",
}

const personReference = (email: string, ifUnmatched: "create" | "ignore") => ({
    target_object: "people",
    target_record_reference: {match: {email_addresses: email}, if_unmatched: ifUnmatched},
})

const postedValues = (call = 0) =>
    (attioClient.post.mock.calls[call][1] as {data: {values: Record<string, unknown>}}).data.values

describe(logRecipientCompletedActivity, () => {
    beforeEach(() => {
        attioClient.post.mockReset()
        attioClient.post.mockResolvedValue(complete({}))
    })

    it("writes an activity linked to every recipient, with the completing one as its recipient", async () => {
        const result = await logRecipientCompletedActivity(completedBy)

        expect(result).toEqual(complete(undefined))
        expect(attioClient.post).toHaveBeenCalledWith(
            expect.stringContaining("/activities/pandadoc_document_recipient_completions/records"),
            {
                data: {
                    values: {
                        title: "Proposal",
                        timestamp: "2026-09-25T11:20:00.000Z",
                        linked_records: [
                            {target_object: "deals", target_record_id: "deal-1"},
                            personReference("other@example.com", "create"),
                            personReference("Signer@example.com", "create"),
                        ],
                        recipient: [personReference("Signer@example.com", "create")],
                        document_url: "https://app.pandadoc.com/a/#/documents/doc-1",
                        recipient_type: "signer",
                        recipient_role: "Client",
                    },
                },
            }
        )
    })

    it("uses the action_by email for the recipient when they aren't listed", async () => {
        await logRecipientCompletedActivity({
            ...completedBy,
            action_by: {email: "unlisted@example.com"},
        })

        expect(postedValues().recipient).toEqual([
            personReference("unlisted@example.com", "create"),
        ])
        expect(postedValues()).not.toHaveProperty("recipient_type")
        expect(postedValues()).not.toHaveProperty("recipient_role")
    })

    it("links only existing recipients but still creates the completing one when Attio rejects creating that many", async () => {
        attioClient.post.mockResolvedValueOnce(errored({code: "LIMIT_REACHED"}))

        const result = await logRecipientCompletedActivity(completedBy)

        expect(result).toEqual(complete(undefined))
        expect(attioClient.post).toHaveBeenCalledTimes(2)
        expect(postedValues(1).linked_records).toEqual([
            {target_object: "deals", target_record_id: "deal-1"},
            personReference("other@example.com", "ignore"),
            personReference("Signer@example.com", "create"),
        ])
        expect(postedValues(1).recipient).toEqual([personReference("Signer@example.com", "create")])
    })

    it("returns any other write error without trying again", async () => {
        attioClient.post.mockResolvedValueOnce(errored({code: "INVALID_REQUEST"}))

        const result = await logRecipientCompletedActivity(completedBy)

        expect(result).toEqual(errored({code: "INVALID_REQUEST"}))
        expect(attioClient.post).toHaveBeenCalledTimes(1)
    })
})
