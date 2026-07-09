import type {App} from "attio"
import {runQuery, showDialog, showToast} from "attio/client"

import {DocumentsList} from "../common/document-list.component"
import getDocumentsByEmails from "../pandadoc/get-documents-by-emails.server"
import {QueryClientProvider, queryClient, useSuspenseQuery} from "../utils/react-query"
import {showCreatePersonDocumentIframe} from "./create-document-action"
import GetPersonByIdQuery from "./get-person-by-id.graphql"

export function createPersonDocumentsQueryKey(contactEmails: string[]) {
    return ["person-documents", contactEmails.join(",")]
}

function PersonDocumentsList({
    personId,
    contactEmails,
}: {
    personId: string
    contactEmails: Array<string>
}) {
    const {data: documents} = useSuspenseQuery({
        queryKey: createPersonDocumentsQueryKey(contactEmails),
        queryFn: () => getDocumentsByEmails(contactEmails),
    })

    const handleCreateDocument = async () => {
        await showCreatePersonDocumentIframe({personId})
    }

    return <DocumentsList documents={documents} onCreateDocument={handleCreateDocument} />
}

export function showPersonDocumentsDialog({
    personId,
    contactEmails,
}: {
    personId: string
    contactEmails: string[]
}) {
    showDialog({
        title: "View documents",
        Dialog: () => {
            return (
                <QueryClientProvider client={queryClient}>
                    <PersonDocumentsList contactEmails={contactEmails} personId={personId} />
                </QueryClientProvider>
            )
        },
    })
}

export const viewPeopleDocumentsAction: App.Record.Action = {
    id: "view-people-documents",
    label: "View documents",
    objects: "people",
    onTrigger: async ({recordId}) => {
        const {person} = await runQuery(GetPersonByIdQuery, {
            id: recordId,
        })

        const contactEmails = person?.email_addresses ?? []

        if (contactEmails.length === 0) {
            showToast({
                variant: "error",
                title: "No email addresses found for this person",
            })

            return
        }

        showPersonDocumentsDialog({personId: recordId, contactEmails})
    },
}
