import type {App} from "attio"
import {showDialog} from "attio/client"

import {DocumentsList} from "../common/document-list.component"
import getDocumentsByMetadata from "../pandadoc/get-documents-by-metadata.server"
import {QueryClientProvider, queryClient, useSuspenseQuery} from "../utils/react-query"
import {showCreateDealDocumentIframe} from "./create-document-action"
import {DEAL_METADATA_KEY} from "./deal-metadata-key"

export function createDealDocumentsQueryKey(dealId: string) {
    return ["deal-documents", dealId]
}

function DealDocumentsList({dealId}: {dealId: string}) {
    const {data: documents, refetch} = useSuspenseQuery({
        queryKey: createDealDocumentsQueryKey(dealId),
        queryFn: () =>
            getDocumentsByMetadata({
                metadataKey: DEAL_METADATA_KEY,
                metadataValue: dealId,
            }),
    })

    const handleCreateDocument = async () => {
        await showCreateDealDocumentIframe({dealId})
        await refetch()
    }

    return <DocumentsList documents={documents} onCreateDocument={handleCreateDocument} />
}

export async function showDealDocumentsDialog({dealId}: {dealId: string}) {
    await showDialog({
        title: "View documents",
        Dialog: () => {
            return (
                <QueryClientProvider client={queryClient}>
                    <DealDocumentsList dealId={dealId} />
                </QueryClientProvider>
            )
        },
    })
}

export const viewDealsDocumentsAction: App.Record.Action = {
    id: "view-deals-documents",
    label: "View documents",
    objects: "deals",
    onTrigger: async ({recordId}) => {
        showDealDocumentsDialog({dealId: recordId})
    },
}
