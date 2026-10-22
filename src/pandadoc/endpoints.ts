const PANDADOC_API_BASE_URL = "https://api.pandadoc.com/public/v1"
const PANDADOC_APP_BASE_URL = "https://app.pandadoc.com"

/**
 * Absolute URL builders for PandaDoc.
 *
 * @see https://developers.pandadoc.com
 */
export const endpoints = {
    /**
     * @see https://developers.pandadoc.com/reference/list-contacts
     */
    contactsByEmail: (email: string) =>
        `${PANDADOC_API_BASE_URL}/contacts?email=${encodeURIComponent(email)}`,

    /**
     * @see https://developers.pandadoc.com/reference/list-documents
     */
    documentsByContactId: (contactId: string) =>
        `${PANDADOC_API_BASE_URL}/documents?contact_id=${encodeURIComponent(contactId)}`,

    /**
     * @see https://developers.pandadoc.com/reference/list-documents
     */
    documentsByMetadata: ({
        metadataKey,
        metadataValue,
    }: {
        metadataKey: string
        metadataValue: string
    }) =>
        `${PANDADOC_API_BASE_URL}/documents?metadata_${metadataKey}=${encodeURIComponent(metadataValue)}`,

    /** Opens the document in the PandaDoc web app. */
    documentWebUrl: (documentId: string) =>
        `${PANDADOC_APP_BASE_URL}/a/#/documents/${encodeURIComponent(documentId)}`,

    /**
     * @see https://developers.pandadoc.com/reference/list-templates
     */
    templates: `${PANDADOC_API_BASE_URL}/templates`,

    /**
     * @see https://developers.pandadoc.com/reference/create-webhooks-subscription
     */
    webhookSubscriptions: `${PANDADOC_API_BASE_URL}/webhook-subscriptions`,

    /**
     * @see https://developers.pandadoc.com/reference/delete-webhooks-subscription
     */
    webhookSubscription: (id: string) =>
        `${PANDADOC_API_BASE_URL}/webhook-subscriptions/${encodeURIComponent(id)}`,
} as const
