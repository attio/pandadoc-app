import * as z from "zod"

const contactSchema = z.object({
    id: z.string(),
    email: z.string(),
})

export const contactsResponseSchema = z.object({
    results: z.array(contactSchema),
})

const documentSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.union([
        z.literal("document.uploaded"),
        z.literal("document.error"),
        z.literal("document.draft"),
        z.literal("document.sent"),
        z.literal("document.viewed"),
        z.literal("document.waiting_approval"),
        z.literal("document.rejected"),
        z.literal("document.approved"),
        z.literal("document.waiting_pay"),
        z.literal("document.paid"),
        z.literal("document.completed"),
        z.literal("document.voided"),
        z.literal("document.declined"),
        z.literal("document.external_review"),
    ]),
})

export const documentsResponseSchema = z.object({
    results: z.array(documentSchema),
})

export type PandadocDocument = z.infer<typeof documentSchema>
