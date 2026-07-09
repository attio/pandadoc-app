import {complete, errored, type Result} from "@attio/fetchable"
import type {GetPersonByIdQuery as GetPersonByIdQueryType} from "../people/get-person-by-id.graphql"

export type Recipient = {
    first_name: string
    last_name: string
    email: string
    phone?: string
    company?: string
    country?: string
    postcode?: string
    state?: string
    city?: string
}

export function parseRecipientsFromPerson(
    person: GetPersonByIdQueryType["person"]
): Result<
    Array<Recipient>,
    | "PERSON_NOT_FOUND"
    | "EMAIL_REQUIRED"
    | "FULL_NAME_REQUIRED"
    | "FIRST_NAME_REQUIRED"
    | "LAST_NAME_REQUIRED"
> {
    if (!person) {
        return errored("PERSON_NOT_FOUND" as const)
    }

    if (person.email_addresses.length === 0) {
        return errored("EMAIL_REQUIRED" as const)
    }

    const firstName = person.name?.first_name
    const lastName = person.name?.last_name

    if (!firstName && !lastName) {
        return errored("FULL_NAME_REQUIRED" as const)
    }

    if (!firstName) {
        return errored("FIRST_NAME_REQUIRED" as const)
    }

    if (!lastName) {
        return errored("LAST_NAME_REQUIRED" as const)
    }

    return complete(
        person.email_addresses.map((email) => ({
            first_name: firstName,
            last_name: lastName,
            email,
            phone: person.phone_numbers[0] ?? undefined,
            company: person.company?.name ?? undefined,
            country: person.primary_location?.country ?? undefined,
            postcode: person.primary_location?.postcode ?? undefined,
            state: person.primary_location?.region ?? undefined,
            city: person.primary_location?.locality ?? undefined,
        }))
    )
}
