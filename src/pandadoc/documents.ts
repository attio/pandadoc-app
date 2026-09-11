import {type AsyncResult, combineAsync, complete, isErrored, map} from "@attio/fetchable"
import {createLogger} from "../utils/logger"
import {type PandadocApiError, pandadocApi} from "./client"
import {getContactsByEmail} from "./contacts"
import {endpoints} from "./endpoints"
import {parseWith} from "./error"
import {documentsResponseSchema, type PandadocDocument} from "./schemas"

const logger = createLogger("pandadoc documents")

/**
 * @see https://developers.pandadoc.com/reference/list-documents
 */
async function getDocumentsByContactId(
    contactId: string
): AsyncResult<PandadocDocument[], PandadocApiError> {
    const responseResult = await pandadocApi.get(endpoints.documentsByContactId(contactId))

    if (isErrored(responseResult)) {
        logger.error("Failed to list documents for contact", {error: responseResult.error})
        return responseResult
    }

    return map(
        parseWith(documentsResponseSchema, responseResult.value.data),
        ({results}) => results
    )
}

/**
 * @see https://developers.pandadoc.com/reference/list-documents
 */
export async function getDocumentsByMetadata({
    metadataKey,
    metadataValue,
}: {
    metadataKey: string
    metadataValue: string
}): AsyncResult<PandadocDocument[], PandadocApiError> {
    if (!metadataKey || !metadataValue) {
        return complete([])
    }

    const responseResult = await pandadocApi.get(
        endpoints.documentsByMetadata({metadataKey, metadataValue})
    )

    if (isErrored(responseResult)) {
        logger.error("Failed to list documents by metadata", {error: responseResult.error})
        return responseResult
    }

    return map(
        parseWith(documentsResponseSchema, responseResult.value.data),
        ({results}) => results
    )
}

/**
 * Resolves each email to a PandaDoc contact, then fetches every document linked to those contacts.
 */
export async function getDocumentsByEmails(
    emails: string[]
): AsyncResult<PandadocDocument[], PandadocApiError> {
    if (emails.length === 0) {
        return complete([])
    }

    const contactsResult = map(
        await combineAsync(emails.map((email) => getContactsByEmail(email))),
        (perEmail) => perEmail.flat()
    )

    if (isErrored(contactsResult)) {
        return contactsResult
    }

    return map(
        await combineAsync(
            contactsResult.value.map((contact) => getDocumentsByContactId(contact.id))
        ),
        (perContact) => perContact.flat()
    )
}
