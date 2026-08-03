import {type ObjectSlug, showDialog, Extensions} from "attio/client"

import {DocumentsList} from "../../../common/document-list.component"
import getDocumentsByMetadata from "../../../pandadoc/get-documents-by-metadata.server"
import {QueryClientProvider, queryClient, useSuspenseQuery} from "../../../utils/react-query"
import {showCreateCustomObjectDocumentIframe} from "../create-custom-object-documents/extension"
import {CUSTOM_OBJECT_METADATA_KEY} from "../../../custom-objects/custom-object-metadata-key"

export function createCustomObjectDocumentsQueryKey(object: ObjectSlug, recordId: string) {
    return ["custom-object-documents", object, recordId]
}

function CustomObjectDocumentsList({object, recordId}: {object: ObjectSlug; recordId: string}) {
    const {data: documents, refetch} = useSuspenseQuery({
        queryKey: createCustomObjectDocumentsQueryKey(object, recordId),
        queryFn: () =>
            getDocumentsByMetadata({
                metadataKey: CUSTOM_OBJECT_METADATA_KEY,
                metadataValue: `${object}.${recordId}`,
            }),
    })

    const handleCreateDocument = async () => {
        await showCreateCustomObjectDocumentIframe({object, recordId})
        await refetch()
    }

    return <DocumentsList documents={documents} onCreateDocument={handleCreateDocument} />
}

export async function showCustomObjectDocumentsDialog({
    object,
    recordId,
}: {
    object: ObjectSlug
    recordId: string
}) {
    await showDialog({
        title: "View documents",
        Dialog: () => {
            return (
                <QueryClientProvider client={queryClient}>
                    <CustomObjectDocumentsList object={object} recordId={recordId} />
                </QueryClientProvider>
            )
        },
    })
}

export default Extensions.defineExtension({
    type: "record-action",
    id: "view-custom-object-documents",
    label: "View documents",
    objects: ({isStandard}) => !isStandard,
    onTrigger: async ({object, recordId}) => {
        showCustomObjectDocumentsDialog({object, recordId})
    },
})
