import type {App} from "attio"
import {Widget} from "attio/client"
import React from "react"
import {DocumentsWidget} from "../common/document-widget.component"
import getDocumentsByMetadata from "../pandadoc/get-documents-by-metadata.server"
import {QueryClientProvider, queryClient, useSuspenseQuery} from "../utils/react-query"
import {DEAL_METADATA_KEY} from "./deal-metadata-key"
import {showDealDocumentsDialog} from "./view-documents-action"

function DealsDocumentsWidget({dealId}: {dealId: string}) {
    const {data} = useSuspenseQuery({
        queryKey: ["deal-documents", dealId],
        queryFn: () =>
            getDocumentsByMetadata({
                metadataKey: DEAL_METADATA_KEY,
                metadataValue: dealId,
            }),
    })

    return <DocumentsWidget documents={data} onTrigger={() => showDealDocumentsDialog({dealId})} />
}

export const dealsDocumentsWidget: App.Record.Widget = {
    id: "deals-documents",
    label: "Documents",
    objects: "deals",
    color: "#278367",
    Widget: ({recordId}) => {
        return (
            <QueryClientProvider client={queryClient}>
                <React.Suspense fallback={<Widget.Loading />}>
                    <DealsDocumentsWidget dealId={recordId} />
                </React.Suspense>
            </QueryClientProvider>
        )
    },
}
