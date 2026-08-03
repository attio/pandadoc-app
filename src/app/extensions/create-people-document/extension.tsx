import {isErrored} from "@attio/fetchable"
import {runQuery, showToast, Extensions} from "attio/client"
import {parseRecipientsFromPerson} from "../../../common/parse-recipient"
import {showCreateDocumentIframe} from "../../../common/show-create-document-iframe"
import checkConnection from "../../../utils/check-connection.server"
import GetPersonQuery from "../../../people/get-person-by-id.graphql"
import GetPersonAttributesQuery from "../../../people/get-person-attributes.graphql"
import GetPersonAttributeValuesQuery from "../../../people/get-person-attribute-values.graphql"
import {camelCaseToPascalCase} from "../../../utils/camel-to-pascal"
import {queryClient} from "../../../utils/react-query"
import {createPersonDocumentsQueryKey} from "../view-people-documents/extension"
import {formatDate, formatTimestamp} from "../../../utils/format-timestamp"

const SKIPPED_ATTRIBUTE_SLUGS = [
    "record_id",
    "email_addresses",
    "phone_numbers",
    "primary_location",
]

export async function showCreatePersonDocumentIframe({personId}: {personId: string}) {
    await checkConnection()

    const [
        {person},
        {
            people: {attributes},
        },
    ] = await Promise.all([
        runQuery(GetPersonQuery, {
            id: personId,
        }),
        runQuery(GetPersonAttributesQuery),
    ])

    const recipientsResult = parseRecipientsFromPerson(person)

    if (isErrored(recipientsResult)) {
        switch (recipientsResult.error) {
            // This should never happen
            // but we'll handle it just in case
            case "PERSON_NOT_FOUND": {
                console.error("Person not found", personId)
                showToast({
                    variant: "error",
                    title: "Person not found",
                })
                break
            }
            case "EMAIL_REQUIRED":
                showToast({
                    variant: "error",
                    title: "Please add an email address to the person before creating a document",
                })
                break
            case "FULL_NAME_REQUIRED":
                showToast({
                    variant: "error",
                    title: "Please add a first and last name to the person before creating a document",
                })
                break
            case "FIRST_NAME_REQUIRED":
                showToast({
                    variant: "error",
                    title: "Please add a first name to the person before creating a document",
                })
                break
            case "LAST_NAME_REQUIRED":
                showToast({
                    variant: "error",
                    title: "Please add a last name to the person before creating a document",
                })
                break
        }

        return
    }

    const attributeValues = await Promise.all(
        attributes
            .filter((attribute) => !SKIPPED_ATTRIBUTE_SLUGS.includes(attribute.slug))
            .map(async (attribute): Promise<[string, string | number | null | undefined]> => {
                const {person} = await runQuery(GetPersonAttributeValuesQuery, {
                    id: personId,
                    slug: attribute.slug,
                })

                switch (person?.attribute?.__typename) {
                    case "TextValue":
                        return [attribute.slug, person.attribute.text]
                    case "NumberValue":
                        return [attribute.slug, person.attribute.number]
                    case "CurrencyValue":
                        return [attribute.slug, person.attribute.currency?.currency_value]
                    case "RecordReferenceValue":
                        if (person.attribute.record?.__typename === "Person") {
                            return [attribute.slug, person.attribute.record?.name?.full_name]
                        }
                        if (person.attribute.record?.__typename === "Company") {
                            return [attribute.slug, person.attribute.record?.companyName]
                        }
                        return [attribute.slug, null]
                    case "PhoneNumberValue":
                        return [attribute.slug, person.attribute.phoneNumber]
                    case "ActorReferenceValue":
                        if (person.attribute.actor?.__typename === "User") {
                            return [attribute.slug, person.attribute.actor?.name]
                        }
                        return [attribute.slug, null]
                    case "DateValue":
                        return [
                            attribute.slug,
                            person.attribute.date
                                ? formatDate(new Date(person.attribute.date))
                                : null,
                        ]
                    case "TimestampValue": {
                        if (!person.attribute.dateTime) {
                            return [attribute.slug, null]
                        }
                        return [attribute.slug, formatTimestamp(person.attribute.dateTime)]
                    }
                    default:
                        return [attribute.slug, null]
                }
            })
    )

    const tokens = attributeValues.reduce(
        (acc, [slug, value]) => {
            if (value === null || value === undefined) {
                return acc
            }
            acc[`Attio.Person${camelCaseToPascalCase(slug)}`] = value.toString()
            return acc
        },
        {} as Record<string, string>
    )

    await showCreateDocumentIframe({
        recipients: recipientsResult.value,
        tokens: {
            ...tokens,
        },
    })

    await queryClient.invalidateQueries({
        queryKey: createPersonDocumentsQueryKey(
            recipientsResult.value.map((recipient) => recipient.email)
        ),
    })
}

export default Extensions.defineExtension({
    type: "record-action",
    id: "create-people-document",
    label: "Create document",
    objects: "people",
    onTrigger: async ({recordId}) => {
        await showCreatePersonDocumentIframe({personId: recordId})
    },
})
