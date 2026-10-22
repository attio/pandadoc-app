import {type AsyncResult, complete, isErrored} from "@attio/fetchable"
import {attioClient} from "../attio/client"
import {endpoints} from "../attio/endpoints"
import type {AttioApiError} from "../attio/error"
import {endpoints as pandadocEndpoints} from "../pandadoc/endpoints"
import type {WebhookDocument} from "../pandadoc/webhook-payload-schema"
import {createLogger} from "../utils/logger"
import {
    findLinkedRecords,
    findMetadataRecords,
    type IfUnmatched,
    type LinkedRecord,
    personReference,
} from "./find-linked-records"

const logger = createLogger("log document activity")

/**
 * The records to link the activity to. The sender is linked first as a person and always created,
 * even when their email belongs to a workspace member, since Attio never links members in
 * `linked_records`. A sender who is also a recipient is linked once, since Attio rejects an
 * attribute that references the same person twice.
 */
function findActivityLinkedRecords({
    document,
    sentByEmail,
    ifUnmatched,
}: {
    document: WebhookDocument
    sentByEmail: string | undefined
    ifUnmatched: IfUnmatched
}): LinkedRecord[] {
    if (sentByEmail === undefined) {
        return findLinkedRecords(document, ifUnmatched)
    }

    const isSender = (email: string) => email.toLowerCase() === sentByEmail.toLowerCase()

    return [
        ...findMetadataRecords(document),
        personReference(sentByEmail, "create"),
        ...(document.recipients ?? [])
            .filter(({email}) => !isSender(email))
            .map(({email}) => personReference(email, ifUnmatched)),
    ]
}

function writeDocumentActivity({
    activitySlug,
    document,
    occurredAt,
    linkedRecords,
    sentByEmail,
}: {
    activitySlug: string
    document: WebhookDocument
    occurredAt: Date
    linkedRecords: LinkedRecord[]
    sentByEmail: string | undefined
}): AsyncResult<unknown, AttioApiError> {
    return attioClient.post(endpoints.api.activityRecords(activitySlug), {
        data: {
            values: {
                title: document.name,
                timestamp: occurredAt.toISOString(),
                linked_records: linkedRecords,
                document_url: pandadocEndpoints.documentWebUrl(document.id),
                // A plain email, so Attio links the workspace member with that email if there is one,
                // and otherwise the person, created if missing.
                ...(sentByEmail === undefined ? {} : {sent_by: [sentByEmail]}),
            },
        },
    })
}

/**
 * Writes an activity record of the given type onto the document's Attio records, creating a
 * person for each recipient who isn't one yet, workspace members included. Does nothing when the
 * document has no linked record or recipient, since an activity needs at least one linked record.
 */
export async function logDocumentActivity({
    activitySlug,
    document,
    occurredAt,
    sentByEmail,
}: {
    activitySlug: string
    document: WebhookDocument
    occurredAt: Date
    /** Who sent the document, written to `sent_by`. Only the sends activity has that attribute. */
    sentByEmail?: string
}): AsyncResult<void, AttioApiError> {
    const linkedRecords = findActivityLinkedRecords({document, sentByEmail, ifUnmatched: "create"})

    if (linkedRecords.length === 0) {
        logger.log("No Attio record to link the document activity to, skipping")
        return complete(undefined)
    }

    let created = await writeDocumentActivity({
        activitySlug,
        document,
        occurredAt,
        linkedRecords,
        sentByEmail,
    })

    // Attio rejects a write that would create more referenced records than its per-request
    // limit, so link only the recipients who are already people.
    if (isErrored(created) && created.error.code === "LIMIT_REACHED") {
        logger.log("Too many recipients to create as people, linking only existing people")
        created = await writeDocumentActivity({
            activitySlug,
            document,
            occurredAt,
            linkedRecords: findActivityLinkedRecords({
                document,
                sentByEmail,
                ifUnmatched: "ignore",
            }),
            sentByEmail,
        })
    }

    if (isErrored(created)) {
        return created
    }

    return complete(undefined)
}
