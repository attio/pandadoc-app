import {Settings, showIframe, showToast} from "attio/client"
import type {Recipient} from "./parse-recipient"
import schema from "../app/settings/schema"

export async function showCreateDocumentIframe({
    recipients,
    tokens,
    metadata = {},
}: {
    recipients: Array<Recipient>
    tokens: Record<string, string>
    metadata?: Record<string, string>
}) {
    const openDocumentsInNewTab = await Settings.getSettings(schema, "openDocumentsInNewTab")

    await showIframe({
        url: "https://pandadoc.attio-embedded-apps.com",
        // Use this for working in development Attio:
        // url: "https://attio-embedded-apps.attio.me/pandadoc",
        width: "1500px",
        height: "800px",
        onMessage: (message, {hideIframe, sendMessage}) => {
            if (typeof message !== "object" || message === null || !("type" in message)) {
                return
            }

            if (message.type === "close") {
                hideIframe()
            } else if (message.type === "ready") {
                sendMessage({
                    type: "initial-data",
                    initialData: {
                        recipients: recipients,
                        tokens,
                        metadata,
                    },
                    openInNewTab: openDocumentsInNewTab ?? false,
                })
            } else if (message.type === "success") {
                showToast({
                    variant: "success",
                    title: "Successfully created document",
                })
                hideIframe()
            } else if (message.type === "document-created") {
                // Only sent when the document was opened in a new tab, so close the
                // builder behind it. Otherwise the member keeps working in the embed
                // and the builder stays open.
                hideIframe()
            }
        },
    })
}
