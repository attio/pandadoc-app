import {type ObjectSlug, runQuery, Extensions} from "attio/client"
import {showCreateDocumentIframe} from "../../../common/show-create-document-iframe"
import checkConnection from "../../../utils/check-connection.server"
import {CUSTOM_OBJECT_METADATA_KEY} from "../../../custom-objects/custom-object-metadata-key"
import GetCustomObjectAttributesQuery from "../../../custom-objects/get-custom-object-attributes.graphql"
import GetCustomObjectAttributeValuesQuery from "../../../custom-objects/get-custom-object-attribute-values.graphql"
import {camelCaseToPascalCase} from "../../../utils/camel-to-pascal"
import {queryClient} from "../../../utils/react-query"
import {createCustomObjectDocumentsQueryKey} from "../view-custom-object-documents/extension"
import {formatDate, formatTimestamp} from "../../../utils/format-timestamp"
import {parseRecipientsFromPerson, type Recipient} from "../../../common/parse-recipient"
import {isComplete} from "@attio/fetchable"

const SKIPPED_ATTRIBUTE_SLUGS = ["record_id"]

export async function showCreateCustomObjectDocumentIframe({
    object,
    recordId,
}: {
    object: ObjectSlug
    recordId: string
}) {
    await checkConnection()

    const {objects} = await runQuery(GetCustomObjectAttributesQuery)
    const customObject = objects?.find((obj) => obj?.slug === object)
    if (!customObject) {
        throw new Error(`Custom object ${object}:${recordId} not found`)
    }
    const {name, attributes: attributeDefinitions} = customObject
    const recipients: Recipient[] = []

    const attributeValues = await Promise.all(
        attributeDefinitions
            .filter(
                (attributeDefinition) => !SKIPPED_ATTRIBUTE_SLUGS.includes(attributeDefinition.slug)
            )
            .map(async ({slug}): Promise<[string, string | number | null | undefined]> => {
                const {record} = await runQuery(GetCustomObjectAttributeValuesQuery, {
                    id: recordId,
                    object,
                    slug,
                })

                const attribute = record?.attribute
                switch (attribute?.__typename) {
                    case "TextValue":
                        return [slug, attribute.text]
                    case "NumberValue":
                        return [slug, attribute.number]
                    case "CurrencyValue":
                        return [slug, attribute.currency?.currency_value]
                    case "RecordReferenceValue":
                        if (attribute.record?.__typename === "Person") {
                            const parsed = parseRecipientsFromPerson(attribute.record)
                            if (isComplete(parsed)) {
                                recipients.push(...parsed.value)
                            }
                            return [slug, attribute.record?.name?.full_name]
                        }
                        if (attribute.record?.__typename === "Company") {
                            return [slug, attribute.record?.companyName]
                        }
                        return [slug, null]
                    case "PhoneNumberValue":
                        return [slug, attribute.phoneNumber]
                    case "ActorReferenceValue":
                        if (attribute.actor?.__typename === "User") {
                            return [slug, attribute.actor?.name]
                        }
                        return [slug, null]
                    case "DateValue":
                        return [slug, attribute.date ? formatDate(new Date(attribute.date)) : null]
                    case "TimestampValue": {
                        if (!attribute.dateTime) {
                            return [slug, null]
                        }
                        return [slug, formatTimestamp(attribute.dateTime)]
                    }
                    case "SelectValue":
                        return [slug, attribute.selectValue?.title ?? null]
                    default:
                        return [slug, null]
                }
            })
    )

    const defaultTokens: Record<string, string> = {
        "Attio.PluralNoun": name,
    }

    const tokens = attributeValues.reduce((acc, [slug, value]) => {
        if (value === null || value === undefined) {
            return acc
        }
        acc[`Attio.${camelCaseToPascalCase(name)}${camelCaseToPascalCase(slug)}`] = value.toString()
        return acc
    }, defaultTokens)

    await showCreateDocumentIframe({
        recipients,
        tokens,
        metadata: {
            [CUSTOM_OBJECT_METADATA_KEY]: `${object}.${recordId}`,
        },
    })

    await queryClient.invalidateQueries({
        queryKey: createCustomObjectDocumentsQueryKey(object, recordId),
    })
}

export default Extensions.defineExtension({
    type: "record-action",
    id: "create-custom-object-documents",
    label: "Create document",
    onTrigger: async ({object, recordId}) => {
        await showCreateCustomObjectDocumentIframe({object, recordId})
    },
    objects: ({isStandard}) => !isStandard,
})
