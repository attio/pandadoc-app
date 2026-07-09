import {Badge, Widget} from "attio/client"
import type {PandadocDocument} from "../pandadoc/schemas"
import {getStatusLabel} from "./get-status-label"

function PandadocWidget({
    children,
    onTrigger,
}: {
    children: React.ReactNode
    onTrigger?: () => void
}) {
    return (
        <Widget.TextWidget onTrigger={onTrigger}>
            <Widget.Title>Pandadoc</Widget.Title>
            {children}
        </Widget.TextWidget>
    )
}

export function DocumentsWidget({
    documents,
    onTrigger,
}: {
    documents: PandadocDocument[]
    onTrigger?: () => void
}) {
    if (documents.length === 0) {
        return (
            <PandadocWidget onTrigger={onTrigger}>
                <Widget.Text.Primary>No documents</Widget.Text.Primary>
            </PandadocWidget>
        )
    }

    const lastModifiedDocument = documents[0]

    return (
        <PandadocWidget onTrigger={onTrigger}>
            <Widget.Text.Primary>{lastModifiedDocument.name}</Widget.Text.Primary>
            <Widget.Text.Secondary>
                {getStatusLabel(lastModifiedDocument.status)}
            </Widget.Text.Secondary>
            {documents.length > 1 && (
                <Widget.Decoration>
                    <Badge color="grey">{`+${documents.length - 1}`}</Badge>
                </Widget.Decoration>
            )}
        </PandadocWidget>
    )
}
