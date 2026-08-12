export type PersonForDefaultTokens = {
    name: {first_name: string | null; last_name: string | null; full_name: string | null} | null
    email_addresses: Array<string>
    phone_numbers: Array<string>
    primary_location: {
        locality: string | null
        country: string | null
    } | null
} | null

/**
 * Builds tokens for the person fields that the per-attribute lookup in
 * showCreatePersonDocumentIframe can't reach: `name`, `email_addresses` and
 * `phone_numbers`/`primary_location` are excluded there via
 * SKIPPED_ATTRIBUTE_SLUGS (or aren't a fetched AttributeType at all), so they
 * need to be read directly off the person record instead.
 */
export function getDefaultPersonTokens(person: PersonForDefaultTokens): Record<string, string> {
    const fields: Record<string, string | null | undefined> = {
        PersonFirstName: person?.name?.first_name,
        PersonLastName: person?.name?.last_name,
        PersonFullName: person?.name?.full_name,
        PersonEmailAddress: person?.email_addresses[0],
        PersonPhoneNumber: person?.phone_numbers[0],
        PersonLocationLocality: person?.primary_location?.locality,
        PersonLocationCountry: person?.primary_location?.country,
    }

    return Object.entries(fields).reduce((tokens: Record<string, string>, [key, value]) => {
        if (value) {
            tokens[`Attio.${key}`] = value
        }
        return tokens
    }, {})
}
