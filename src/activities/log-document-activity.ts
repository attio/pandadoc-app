import {type AsyncResult, complete, isErrored} from "@attio/fetchable"
import {attioClient} from "../attio/client"
import {endpoints} from "../attio/endpoints"
import type {AttioApiError} from "../attio/error"
import {
    CUSTOM_OBJECT_METADATA_KEY,
    splitCustomObjectMetadataValue,
} from "../custom-objects/custom-object-metadata-key"
import {DEAL_METADATA_KEY} from "../deals/deal-metadata-key"
import {endpoints as pandadocEndpoints} from "../pandadoc/endpoints"
import type {WebhookDocument} from "../pandadoc/webhook-payload-schema"
import {createLogger} from "../utils/logger"

const logger = createLogger("log document activity")

type IfUnmatched = "create" | "ignore"

type LinkedRecord =
    | {target_object: string; target_record_id: string}
    | {
          target_object: "people"
          target_record_reference: {
              match: {email_addresses: string}
              if_unmatched: IfUnmatched
          }
      }

/**
 * Collects the Attio records to link the activity to: the deal or custom-object record in the
 * document's metadata, and a person for each recipient, matched by email. `ifUnmatched` sets
 * whether a recipient who isn't a person yet is created or left out.
 */
function findLinkedRecords(document: WebhookDocument, ifUnmatched: IfUnmatched): LinkedRecord[] {
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

    for (const recipient of document.recipients ?? []) {
        linkedRecords.push({
            target_object: "people",
            target_record_reference: {
                match: {email_addresses: recipient.email},
                if_unmatched: ifUnmatched,
            },
        })
    }

    return linkedRecords
}

function writeDocumentActivity({
    activitySlug,
    document,
    occurredAt,
    linkedRecords,
}: {
    activitySlug: string
    document: WebhookDocument
    occurredAt: Date
    linkedRecords: LinkedRecord[]
}): AsyncResult<unknown, AttioApiError> {
    return attioClient.post(endpoints.api.activityRecords(activitySlug), {
        data: {
            values: {
                title: document.name,
                timestamp: occurredAt.toISOString(),
                linked_records: linkedRecords,
                document_url: pandadocEndpoints.documentWebUrl(document.id),
            },
        },
    })
}

/**
 * Writes an activity record of the given type onto the document's Attio records, creating a
 * person for each recipient who isn't one yet. Does nothing when the document has no linked
 * record or recipient, since an activity needs at least one linked record.
 */
export async function logDocumentActivity({
    activitySlug,
    document,
    occurredAt,
}: {
    activitySlug: string
    document: WebhookDocument
    occurredAt: Date
}): AsyncResult<void, AttioApiError> {
    const linkedRecords = findLinkedRecords(document, "create")

    if (linkedRecords.length === 0) {
        logger.log("No Attio record to link the document activity to, skipping")
        return complete(undefined)
    }

    let created = await writeDocumentActivity({activitySlug, document, occurredAt, linkedRecords})

    // Attio rejects a write that would create more referenced records than its per-request
    // limit, so link only the recipients who are already people.
    if (isErrored(created) && created.error.code === "LIMIT_REACHED") {
        logger.log("Too many recipients to create as people, linking only existing people")
        created = await writeDocumentActivity({
            activitySlug,
            document,
            occurredAt,
            linkedRecords: findLinkedRecords(document, "ignore"),
        })
    }

    if (isErrored(created)) {
        return created
    }

    return complete(undefined)
}
