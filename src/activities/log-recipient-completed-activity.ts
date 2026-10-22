import {type AsyncResult, complete, isErrored} from "@attio/fetchable"
import {attioClient} from "../attio/client"
import {endpoints} from "../attio/endpoints"
import type {AttioApiError} from "../attio/error"
import {endpoints as pandadocEndpoints} from "../pandadoc/endpoints"
import type {RecipientCompletedData} from "../pandadoc/webhook-payload-schema"
import {createLogger} from "../utils/logger"
import {RECIPIENT_COMPLETED_ACTIVITY_SLUG} from "./activity-definitions"
import {findMetadataRecords, type IfUnmatched, personReference} from "./find-linked-records"

const logger = createLogger("log recipient completed activity")

/**
 * Writes an activity for the recipient who completed their part of a document, with `action_date`
 * as its timestamp. It's linked to every recipient, and `recipient` says which one completed. Like
 * every recipient, the completing one is linked as a person and always created when they aren't one
 * yet, even when their email belongs to a workspace member, since Attio never links members in
 * `linked_records`.
 */
export async function logRecipientCompletedActivity(
    data: RecipientCompletedData
): AsyncResult<void, AttioApiError> {
    const {action_by: actionBy, action_date: actionDate, ...document} = data

    const recipient = document.recipients.find(
        ({email}) => email.toLowerCase() === actionBy.email.toLowerCase()
    )
    const recipientRole = recipient?.roles.filter(Boolean).join(", ")
    // Their email as listed in recipients, or action_by's when they aren't listed.
    const recipientEmail = recipient?.email ?? actionBy.email

    const writeActivity = (ifUnmatched: IfUnmatched) =>
        attioClient.post(endpoints.api.activityRecords(RECIPIENT_COMPLETED_ACTIVITY_SLUG), {
            data: {
                values: {
                    title: document.name,
                    timestamp: new Date(actionDate).toISOString(),
                    linked_records: [
                        ...findMetadataRecords(document),
                        ...document.recipients.map(({email}) =>
                            personReference(
                                email,
                                email === recipientEmail ? "create" : ifUnmatched
                            )
                        ),
                    ],
                    // A plain email, so Attio links the workspace member with that email if there is
                    // one, and otherwise the person.
                    recipient: [recipientEmail],
                    document_url: pandadocEndpoints.documentWebUrl(document.id),
                    ...(recipient ? {recipient_type: recipient.recipient_type} : {}),
                    ...(recipientRole ? {recipient_role: recipientRole} : {}),
                },
            },
        })

    let created = await writeActivity("create")

    // Attio rejects a write that would create more referenced records than its per-request
    // limit, so link only the recipients who are already people.
    if (isErrored(created) && created.error.code === "LIMIT_REACHED") {
        logger.log("Too many recipients to create as people, linking only existing people")
        created = await writeActivity("ignore")
    }

    if (isErrored(created)) {
        return created
    }

    return complete(undefined)
}
