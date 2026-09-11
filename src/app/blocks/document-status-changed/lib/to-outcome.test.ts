import {describe, expect, it} from "vitest"
import type {WebhookDocument} from "../../../../pandadoc/webhook-payload-schema"
import {buildDocumentStatusChangedOutcome} from "./to-outcome"

function buildDocument(overrides: Partial<WebhookDocument> = {}): WebhookDocument {
    return {
        id: "doc-1",
        name: "Sales Agreement",
        status: "document.completed",
        date_completed: "2024-07-08T15:43:53.877522Z",
        metadata: {},
        recipients: [],
        ...overrides,
    }
}

describe(buildDocumentStatusChangedOutcome, () => {
    it("maps the document id, name, and recipient emails", () => {
        const outcome = buildDocumentStatusChangedOutcome(
            buildDocument({
                recipients: [{email: "a@example.com"}, {email: "b@example.com"}],
            })
        )

        expect(outcome.document_id).toBe("doc-1")
        expect(outcome.document_name).toBe("Sales Agreement")
        expect(outcome.recipient_emails).toEqual(["a@example.com", "b@example.com"])
    })

    it("passes through date_completed", () => {
        const outcome = buildDocumentStatusChangedOutcome(buildDocument())

        expect(outcome.date_completed).toEqual(new Date("2024-07-08T15:43:53.877522Z"))
    })

    it("extracts the deal id from metadata", () => {
        const outcome = buildDocumentStatusChangedOutcome(
            buildDocument({metadata: {"attio.deal_id": "deal-123"}})
        )

        expect(outcome.deal_id).toBe("deal-123")
        expect(outcome.custom_object_slug).toBeUndefined()
        expect(outcome.custom_object_record_id).toBeUndefined()
    })

    it("splits the custom object slug and record id from metadata", () => {
        const outcome = buildDocumentStatusChangedOutcome(
            buildDocument({metadata: {"attio.custom_object": "invoices.record-456"}})
        )

        expect(outcome.custom_object_slug).toBe("invoices")
        expect(outcome.custom_object_record_id).toBe("record-456")
        expect(outcome.deal_id).toBeUndefined()
    })
})
