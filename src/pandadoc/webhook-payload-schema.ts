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
