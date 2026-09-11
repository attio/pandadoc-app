/** KV keys under which a per-activation PandaDoc webhook subscription is stored, so deactivate can look it up. */
export const webhookSubscriptionIdKvKey = (uniqueActivationId: string): string =>
    `pandadoc-document-status-changed-webhook-id:${uniqueActivationId}`

export const webhookSharedKeyKvKey = (uniqueActivationId: string): string =>
    `pandadoc-document-status-changed-shared-key:${uniqueActivationId}`

/** KV key marking a PandaDoc webhook delivery (by its X-PandaDoc-Webhook-Event-Id) as already processed. */
export const processedEventKvKey = (uniqueActivationId: string, eventId: string): string =>
    `pandadoc-document-status-changed-processed-event:${uniqueActivationId}:${eventId}`
