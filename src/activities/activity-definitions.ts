type ActivitySchema = "activities" | "interactions"

type AttributeDefinition = {
    apiSlug: string
    title: string
    description: string
} & ({type: "text"} | {type: "record-reference"; allowedObjects: string[]})

export type ActivityDefinition = {
    apiSlug: string
    singularNoun: string
    pluralNoun: string
    extends: ActivitySchema
    attributes: AttributeDefinition[]
}

export const DOCUMENT_OPENED_ACTIVITY_SLUG = "pandadoc_document_opens"
export const RECIPIENT_COMPLETED_ACTIVITY_SLUG = "pandadoc_document_recipient_completions"
export const DOCUMENT_DECLINED_ACTIVITY_SLUG = "pandadoc_document_declines"
export const DOCUMENT_COMPLETED_ACTIVITY_SLUG = "pandadoc_document_completions"
export const DOCUMENT_SENT_ACTIVITY_SLUG = "pandadoc_document_sends"

const DOCUMENT_ATTRIBUTES: AttributeDefinition[] = [
    {
        apiSlug: "document_url",
        title: "Document URL",
        description: "Opens the document in PandaDoc.",
        type: "text",
    },
]

/**
 * All extend `activities`, not `interactions`, which is for people communicating with each other.
 * An activity's schema can't be changed once created.
 */
export const ACTIVITY_DEFINITIONS: ActivityDefinition[] = [
    {
        apiSlug: DOCUMENT_OPENED_ACTIVITY_SLUG,
        singularNoun: "Document open",
        pluralNoun: "Document opens",
        extends: "activities",
        attributes: DOCUMENT_ATTRIBUTES,
    },
    {
        apiSlug: RECIPIENT_COMPLETED_ACTIVITY_SLUG,
        singularNoun: "Document recipient completion",
        pluralNoun: "Document recipient completions",
        extends: "activities",
        attributes: [
            ...DOCUMENT_ATTRIBUTES,
            {
                apiSlug: "recipient",
                title: "Recipient",
                description:
                    "The workspace member or person who completed their part of the document.",
                type: "record-reference",
                allowedObjects: ["people", "workspace_members"],
            },
            {
                apiSlug: "recipient_type",
                title: "Recipient type",
                description: "The recipient's type on the document, such as signer or approver.",
                type: "text",
            },
            {
                apiSlug: "recipient_role",
                title: "Recipient role",
                description: "The recipient's role on the document.",
                type: "text",
            },
        ],
    },
    {
        apiSlug: DOCUMENT_DECLINED_ACTIVITY_SLUG,
        singularNoun: "Document decline",
        pluralNoun: "Document declines",
        extends: "activities",
        attributes: DOCUMENT_ATTRIBUTES,
    },
    {
        apiSlug: DOCUMENT_COMPLETED_ACTIVITY_SLUG,
        singularNoun: "Document completion",
        pluralNoun: "Document completions",
        extends: "activities",
        attributes: DOCUMENT_ATTRIBUTES,
    },
    {
        apiSlug: DOCUMENT_SENT_ACTIVITY_SLUG,
        singularNoun: "Document send",
        pluralNoun: "Document sends",
        extends: "activities",
        attributes: [
            ...DOCUMENT_ATTRIBUTES,
            {
                apiSlug: "sent_by",
                title: "Sent by",
                description: "The workspace member or person who sent the document.",
                type: "record-reference",
                allowedObjects: ["people", "workspace_members"],
            },
        ],
    },
]
