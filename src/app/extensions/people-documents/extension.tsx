import {useQuery, Widget, Extensions} from "attio/client"
import React from "react"
import {DocumentsWidget} from "../../../common/document-widget.component"
import getDocumentsByEmails from "../../../pandadoc/get-documents-by-emails.server"
import {QueryClientProvider, queryClient, useSuspenseQuery} from "../../../utils/react-query"
import GetPersonByIdQuery from "../../../people/get-person-by-id.graphql"
import {showPersonDocumentsDialog} from "../view-people-documents/extension"

function PeopleDocumentsWidget({recordId}: {recordId: string}) {
    const {person} = useQuery(GetPersonByIdQuery, {
        id: recordId,
    })

    const contactEmails = person?.email_addresses ?? []

    const {data} = useSuspenseQuery({
        queryKey: ["person-documents", contactEmails.join(",")],
        queryFn: () => getDocumentsByEmails(contactEmails),
    })

    return (
        <DocumentsWidget
            documents={data}
            onTrigger={() => showPersonDocumentsDialog({personId: recordId, contactEmails})}
        />
    )
}

export default Extensions.defineExtension({
    type: "record-widget",
    id: "people-documents",
    label: "Documents",
    objects: "people",
    color: "#278367",
    Widget: ({recordId}) => {
        return (
            <QueryClientProvider client={queryClient}>
                <React.Suspense fallback={<Widget.Loading />}>
                    <PeopleDocumentsWidget recordId={recordId} />
                </React.Suspense>
            </QueryClientProvider>
        )
    },
})
