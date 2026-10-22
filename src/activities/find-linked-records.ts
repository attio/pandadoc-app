import {
    CUSTOM_OBJECT_METADATA_KEY,
    splitCustomObjectMetadataValue,
} from "../custom-objects/custom-object-metadata-key"
import {DEAL_METADATA_KEY} from "../deals/deal-metadata-key"
import type {WebhookDocument} from "../pandadoc/webhook-payload-schema"

export type IfUnmatched = "create" | "ignore"

type PersonReference = {
    target_object: "people"
    target_record_reference: {
        match: {email_addresses: string}
        if_unmatched: IfUnmatched
    }
}

export type LinkedRecord = {target_object: string; target_record_id: string} | PersonReference

/**
 * References the person with the given email. `ifUnmatched` sets whether they're created or left
 * out when no person has it.
 */
export function personReference(email: string, ifUnmatched: IfUnmatched): PersonReference {
    return {
        target_object: "people",
        target_record_reference: {match: {email_addresses: email}, if_unmatched: ifUnmatched},
    }
}

/** Collects the deal or custom-object record in the document's metadata. */
export function findMetadataRecords(document: WebhookDocument): LinkedRecord[] {
    const metadata = document.metadata ?? {}
    const linkedRecords: LinkedRecord[] = []

    const dealId = metadata[DEAL_METADATA_KEY]

    if (dealId) {
        linkedRecords.push({target_object: "deals", target_record_id: dealId})
    }

    const customObjectValue = metadata[CUSTOM_OBJECT_METADATA_KEY]
    const customObject = customObjectValue
        ? splitCustomObjectMetadataValue(customObjectValue)
        : undefined

    if (customObject) {
        linkedRecords.push({
            target_object: customObject.slug,
            target_record_id: customObject.recordId,
        })
    }

    return linkedRecords
}

/**
 * Collects the Attio records to link the activity to: the deal or custom-object record in the
 * document's metadata, and a person for each recipient, matched by email. `ifUnmatched` sets
 * whether a recipient who isn't a person yet is created or left out.
 */
export function findLinkedRecords(
    document: WebhookDocument,
    ifUnmatched: IfUnmatched
): LinkedRecord[] {
    const linkedRecords = findMetadataRecords(document)

    for (const recipient of document.recipients ?? []) {
        linkedRecords.push(personReference(recipient.email, ifUnmatched))
    }

    return linkedRecords
}
