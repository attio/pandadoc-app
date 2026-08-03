import {isComplete} from "@attio/fetchable"
import {runQuery, Extensions} from "attio/client"
import {parseRecipientsFromPerson} from "../../../common/parse-recipient"
import {showCreateDocumentIframe} from "../../../common/show-create-document-iframe"
import checkConnection from "../../../utils/check-connection.server"
import {DEAL_METADATA_KEY} from "../../../deals/deal-metadata-key"
import GetPeopleByDealIdQuery from "../../../deals/get-people-by-deal-id.graphql"
import GetDealAttributesQuery from "../../../deals/get-deal-attributes.graphql"
import GetDealAttributeValuesQuery from "../../../deals/get-deal-attribute-values.graphql"
import {camelCaseToPascalCase} from "../../../utils/camel-to-pascal"
import {queryClient} from "../../../utils/react-query"
import {createDealDocumentsQueryKey} from "../view-deals-documents/extension"
import {formatDate, formatTimestamp} from "../../../utils/format-timestamp"

const SKIPPED_ATTRIBUTE_SLUGS = ["record_id", "name"]

export async function showCreateDealDocumentIframe({dealId}: {dealId: string}) {
    await checkConnection()

    const [
        {deal},
        {
            deals: {attributes},
        },
    ] = await Promise.all([
        runQuery(GetPeopleByDealIdQuery, {
            id: dealId,
        }),
        runQuery(GetDealAttributesQuery),
    ])

    const attributeValues = await Promise.all(
        attributes
            .filter((attribute) => !SKIPPED_ATTRIBUTE_SLUGS.includes(attribute.slug))
            .map(async (attribute): Promise<[string, string | number | null | undefined]> => {
                const {deal} = await runQuery(GetDealAttributeValuesQuery, {
                    id: dealId,
                    slug: attribute.slug,
                })

                switch (deal?.attribute?.__typename) {
                    case "TextValue":
                        return [attribute.slug, deal.attribute.text]
                    case "NumberValue":
                        return [attribute.slug, deal.attribute.number]
                    case "CurrencyValue":
                        return [attribute.slug, deal.attribute.currency?.currency_value]
                    case "RecordReferenceValue":
                        if (deal.attribute.record?.__typename === "Person") {
                            return [attribute.slug, deal.attribute.record?.name?.full_name]
                        }
                        if (deal.attribute.record?.__typename === "Company") {
                            return [attribute.slug, deal.attribute.record?.companyName]
                        }
                        return [attribute.slug, null]
                    case "PhoneNumberValue":
                        return [attribute.slug, deal.attribute.phoneNumber]
                    case "ActorReferenceValue":
                        if (deal.attribute.actor?.__typename === "User") {
                            return [attribute.slug, deal.attribute.actor?.name]
                        }
                        return [attribute.slug, null]
                    case "DateValue":
                        return [
                            attribute.slug,
                            deal.attribute.date ? formatDate(new Date(deal.attribute.date)) : null,
                        ]
                    case "TimestampValue": {
                        if (!deal.attribute.dateTime) {
                            return [attribute.slug, null]
                        }
                        return [attribute.slug, formatTimestamp(deal.attribute.dateTime)]
                    }
                    default:
                        return [attribute.slug, null]
                }
            })
    )

    const people = deal?.associated_people ?? []

    const recipients = people
        .map((p) => parseRecipientsFromPerson(p))
        .filter(isComplete)
        .flatMap((r) => r.value)

    const dealOwner = deal?.owner

    if (dealOwner && dealOwner.__typename === "User") {
        const [firstName, lastName] = dealOwner.name.split(" ")
        recipients.push({
            first_name: firstName ?? "",
            last_name: lastName ?? "",
            email: dealOwner.email,
        })
    }

    const [ownerFirstName, ownerLastName] =
        deal?.owner?.__typename === "User" ? deal.owner.name.split(" ") : ["", ""]

    const defaultTokens: Record<string, string> = {
        ...(ownerFirstName ? {"Attio.DealOwnerFirstName": ownerFirstName} : {}),
        ...(ownerLastName ? {"Attio.DealOwnerLastName": ownerLastName} : {}),
        ...(deal?.name ? {"Attio.DealName": deal.name} : {}),
    }

    const tokens = attributeValues.reduce((acc, [slug, value]) => {
        if (value === null || value === undefined) {
            return acc
        }
        acc[`Attio.Deal${camelCaseToPascalCase(slug)}`] = value.toString()
        return acc
    }, defaultTokens)

    await showCreateDocumentIframe({
        recipients,
        tokens: {
            ...tokens,
        },
        metadata: {
            [DEAL_METADATA_KEY]: dealId,
        },
    })

    await queryClient.invalidateQueries({
        queryKey: createDealDocumentsQueryKey(dealId),
    })
}

export default Extensions.defineExtension({
    type: "record-action",
    id: "create-deals-document",
    label: "Create document",
    objects: "deals",
    onTrigger: async ({recordId}) => {
        await showCreateDealDocumentIframe({dealId: recordId})
    },
})
