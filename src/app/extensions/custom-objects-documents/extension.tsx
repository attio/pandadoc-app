import {type ObjectSlug, Widget, Extensions} from "attio/client"
import React from "react"
import {DocumentsWidget} from "../../../common/document-widget.component"
import getDocumentsByMetadata from "../../../pandadoc/get-documents-by-metadata.server"
import {QueryClientProvider, queryClient, useSuspenseQuery} from "../../../utils/react-query"
import {CUSTOM_OBJECT_METADATA_KEY} from "../../../custom-objects/custom-object-metadata-key"
import {showCustomObjectDocumentsDialog} from "../view-custom-object-documents/extension"

function CustomObjectsDocumentsWidget({object, recordId}: {object: ObjectSlug; recordId: string}) {
    const {data} = useSuspenseQuery({
        queryKey: ["custom-object-documents", object, recordId],
        queryFn: () =>
            getDocumentsByMetadata({
                metadataKey: CUSTOM_OBJECT_METADATA_KEY,
                metadataValue: `${object}.${recordId}`,
            }),
    })

    return (
        <DocumentsWidget
            documents={data}
            onTrigger={() => showCustomObjectDocumentsDialog({object, recordId})}
        />
    )
}

export default Extensions.defineExtension({
    type: "record-widget",
    id: "custom-objects-documents",
    label: "Documents",
    color: "#278367",
    Widget: ({recordId, object}) => {
        return (
            <QueryClientProvider client={queryClient}>
                <React.Suspense fallback={<Widget.Loading />}>
                    <CustomObjectsDocumentsWidget object={object} recordId={recordId} />
                </React.Suspense>
            </QueryClientProvider>
        )
    },
    objects: ({isStandard}) => !isStandard,
})
