import {type AsyncResult, isErrored, map} from "@attio/fetchable"
import {createLogger} from "../utils/logger"
import {type PandadocApiError, pandadocApi} from "./client"
import {endpoints} from "./endpoints"
import {parseWith} from "./error"
import {contactsResponseSchema, type PandadocContact} from "./schemas"

const logger = createLogger("pandadoc contacts")

/**
 * @see https://developers.pandadoc.com/reference/list-contacts
 */
export async function getContactsByEmail(
    email: string
): AsyncResult<PandadocContact[], PandadocApiError> {
    const responseResult = await pandadocApi.get(endpoints.contactsByEmail(email))

    if (isErrored(responseResult)) {
        logger.error("Failed to list contacts for email", {error: responseResult.error})
        return responseResult
    }

    return map(parseWith(contactsResponseSchema, responseResult.value.data), ({results}) => results)
}
