import {isErrored, valueOrElse} from "@attio/fetchable"
import {getDocumentsByEmails as getDocumentsByEmailsResult} from "../../pandadoc/documents"
import type {PandadocDocument} from "../../pandadoc/schemas"
import {createLogger} from "../../utils/logger"

const logger = createLogger("get-documents-by-emails")

export default async function getDocumentsByEmails(
    emails: string[]
): Promise<Array<PandadocDocument>> {
    const result = await getDocumentsByEmailsResult(emails)

    if (isErrored(result)) {
        logger.error("Failed to get documents by email", {error: result.error})
    }

    return valueOrElse(result, [])
}
