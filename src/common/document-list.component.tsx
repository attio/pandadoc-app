import {StatusBadge, DialogList} from "attio/client"

import type {PandadocDocument} from "../pandadoc/schemas"
import {getStatusColor} from "./get-status-color"
import {getStatusLabel} from "./get-status-label"

export function DocumentsList({
    documents,
    onCreateDocument,
}: {
    documents: PandadocDocument[]
    onCreateDocument: () => void
}) {
    return (
        <DialogList
            emptyState={{
                text: "This record doesn’t have any documents. Create one to view it here.",
                actions: [
                    {
                        text: "Create document",
                        icon: "Plus",
                        onTrigger: onCreateDocument,
                    },
                ],
            }}
        >
            {documents.map((document) => {
                const badgeProps = {
                    label: getStatusLabel(document.status),
                    color: getStatusColor(document.status),
                }

                return (
                    <DialogList.Item
                        key={document.id}
                        icon="Note"
                        onTrigger={() => {
                            window.open(
                                `https://app.pandadoc.com/a/#/documents/${document.id}`,
                                "_blank"
                            )
                        }}
                        actionLabel="Open Document"
                        suffix={
                            <StatusBadge color={badgeProps.color}>{badgeProps.label}</StatusBadge>
                        }
                    >
                        {document.name ?? "Untitled"}
                    </DialogList.Item>
                )
            })}
        </DialogList>
    )
}
