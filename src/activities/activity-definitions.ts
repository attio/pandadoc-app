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
        apiSlug: "pandadoc_document_opens",
        singularNoun: "Document open",
        pluralNoun: "Document opens",
        extends: "activities",
        attributes: DOCUMENT_ATTRIBUTES,
    },
    {
        apiSlug: "pandadoc_document_recipient_completions",
        singularNoun: "Document recipient completion",
        pluralNoun: "Document recipient completions",
        extends: "activities",
        attributes: [
            ...DOCUMENT_ATTRIBUTES,
            {
                apiSlug: "recipient",
                title: "Recipient",
                description: "The recipient who completed their part of the document.",
                type: "record-reference",
                allowedObjects: ["people"],
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
        apiSlug: "pandadoc_document_declines",
        singularNoun: "Document decline",
        pluralNoun: "Document declines",
        extends: "activities",
        attributes: DOCUMENT_ATTRIBUTES,
    },
    {
        apiSlug: "pandadoc_document_completions",
        singularNoun: "Document completion",
        pluralNoun: "Document completions",
        extends: "activities",
        attributes: DOCUMENT_ATTRIBUTES,
    },
]
