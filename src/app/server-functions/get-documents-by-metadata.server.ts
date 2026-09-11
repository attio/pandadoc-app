import {isErrored, valueOrElse} from "@attio/fetchable"
import {getDocumentsByMetadata as getDocumentsByMetadataResult} from "../../pandadoc/documents"
import type {PandadocDocument} from "../../pandadoc/schemas"
import {createLogger} from "../../utils/logger"

const logger = createLogger("get-documents-by-metadata")

export default async function getDocumentsByMetadata({
    metadataKey,
    metadataValue,
}: {
    metadataKey: string
    metadataValue: string
}): Promise<Array<PandadocDocument>> {
    const result = await getDocumentsByMetadataResult({metadataKey, metadataValue})

    if (isErrored(result)) {
        logger.error("Failed to get documents by metadata", {error: result.error})
    }

    return valueOrElse(result, [])
}
