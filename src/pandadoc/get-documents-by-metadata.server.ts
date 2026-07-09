import {callPandadocApi} from "./call-pandadoc-api"
import {documentsResponseSchema, type PandadocDocument} from "./schemas"

export default async function getDocumentsByMetadata({
    metadataKey,
    metadataValue,
}: {
    metadataKey: string
    metadataValue: string
}): Promise<Array<PandadocDocument>> {
    if (!metadataKey || !metadataValue) {
        return []
    }

    const documentsResponse = await callPandadocApi({
        path: `documents?metadata_${metadataKey}=${metadataValue}`,
        method: "GET",
    })

    return documentsResponseSchema.parse(documentsResponse).results
}
