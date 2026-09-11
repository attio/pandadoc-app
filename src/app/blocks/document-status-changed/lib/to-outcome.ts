import type {WebhookDocument} from "../../../../pandadoc/webhook-payload-schema"
import {CUSTOM_OBJECT_METADATA_KEY} from "../../../../custom-objects/custom-object-metadata-key"
import {DEAL_METADATA_KEY} from "../../../../deals/deal-metadata-key"

export type DocumentStatusChangedOutcome = {
    document_id: string
    document_name: string
    recipient_emails: string[]
    date_completed?: Date
    date_modified?: Date
    deal_id?: string
    custom_object_slug?: string
    custom_object_record_id?: string
}

function splitCustomObjectMetadataValue(
    value: string
): {slug: string; recordId: string} | undefined {
    const separatorIndex = value.indexOf(".")

    if (separatorIndex === -1) {
        return undefined
    }

    return {
        slug: value.slice(0, separatorIndex),
        recordId: value.slice(separatorIndex + 1),
    }
}

export function buildDocumentStatusChangedOutcome(
    document: WebhookDocument
): DocumentStatusChangedOutcome {
    const metadata = document.metadata ?? {}
    const customObjectValue = metadata[CUSTOM_OBJECT_METADATA_KEY]
    const customObject = customObjectValue
        ? splitCustomObjectMetadataValue(customObjectValue)
        : undefined

    return {
        document_id: document.id,
        document_name: document.name,
        recipient_emails: (document.recipients ?? []).map((recipient) => recipient.email),
        date_completed: document.date_completed ? new Date(document.date_completed) : undefined,
        date_modified: document.date_modified ? new Date(document.date_modified) : undefined,
        deal_id: metadata[DEAL_METADATA_KEY],
        custom_object_slug: customObject?.slug,
        custom_object_record_id: customObject?.recordId,
    }
}
