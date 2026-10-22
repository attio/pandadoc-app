import {type AsyncResult, complete, isErrored} from "@attio/fetchable"
import {attioClient} from "../attio/client"
import {endpoints} from "../attio/endpoints"
import type {AttioApiError} from "../attio/error"
import {endpoints as pandadocEndpoints} from "../pandadoc/endpoints"
import type {WebhookDocument} from "../pandadoc/webhook-payload-schema"
import {createLogger} from "../utils/logger"
import {findLinkedRecords, type LinkedRecord} from "./find-linked-records"

const logger = createLogger("log document activity")

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
