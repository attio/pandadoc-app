import * as z from "zod"

const webhookRecipientSchema = z.object({
    email: z.string(),
})

export const webhookDocumentSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    date_completed: z.string().nullish(),
    date_modified: z.string(),
    metadata: z.record(z.string(), z.string()).optional(),
    recipients: z.array(webhookRecipientSchema).optional(),
    // PandaDoc sends this as an explicit `null`, not an omitted key, for documents not
    // created from a template.
    template: z.object({id: z.string()}).nullish(),
})

/**
 * The data of a `recipient_completed` event: the document plus the recipient who completed it.
 * `action_by` only reliably carries the recipient's email, so their type and roles are read from
 * their entry in `recipients`.
 *
 * @see https://developers.pandadoc.com/reference/handlerecipientcompleteddocument
 */
export const recipientCompletedDataSchema = webhookDocumentSchema.extend({
    recipients: z.array(
        webhookRecipientSchema.extend({
            recipient_type: z.string(),
            roles: z.array(z.string()),
        })
    ),
    action_by: z.object({email: z.string()}),
    action_date: z.string(),
})

export type RecipientCompletedData = z.infer<typeof recipientCompletedDataSchema>

const webhookEventSchema = z.object({
    event: z.string(),
    data: webhookDocumentSchema,
})

export const documentStateChangedWebhookBodySchema = z.array(webhookEventSchema)

/**
 * A delivery that may mix trigger types, so `data` is only parsed once the event is known.
 */
export const mixedEventsWebhookBodySchema = z.array(
    z.object({event: z.string(), data: z.unknown()})
)

export type WebhookDocument = z.infer<typeof webhookDocumentSchema>
