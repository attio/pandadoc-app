import {describe, expect, it} from "vitest"
import {getDefaultPersonTokens, type PersonForDefaultTokens} from "./get-default-person-tokens"

const basePerson: NonNullable<PersonForDefaultTokens> = {
    name: {first_name: "Ada", last_name: "Lovelace", full_name: "Ada Lovelace"},
    email_addresses: ["ada@example.com"],
    phone_numbers: ["+15551234567"],
    primary_location: {
        locality: "London",
        country: "United Kingdom",
    },
}

describe(getDefaultPersonTokens, () => {
    it("maps every field to its Attio.Person token", () => {
        expect(getDefaultPersonTokens(basePerson)).toEqual({
            "Attio.PersonFirstName": "Ada",
            "Attio.PersonLastName": "Lovelace",
            "Attio.PersonFullName": "Ada Lovelace",
            "Attio.PersonEmailAddress": "ada@example.com",
            "Attio.PersonPhoneNumber": "+15551234567",
            "Attio.PersonLocationLocality": "London",
            "Attio.PersonLocationCountry": "United Kingdom",
        })
    })

    it("omits tokens for missing fields instead of writing empty strings", () => {
        const tokens = getDefaultPersonTokens({
            name: {first_name: "Ada", last_name: null, full_name: null},
            email_addresses: [],
            phone_numbers: [],
            primary_location: null,
        })

        expect(tokens).toEqual({"Attio.PersonFirstName": "Ada"})
    })

    it("returns no tokens for a null person", () => {
        expect(getDefaultPersonTokens(null)).toEqual({})
    })

    it("uses only the first email address and phone number", () => {
        const tokens = getDefaultPersonTokens({
            ...basePerson,
            email_addresses: ["ada@example.com", "other@example.com"],
            phone_numbers: ["+15551234567", "+15557654321"],
        })

        expect(tokens["Attio.PersonEmailAddress"]).toBe("ada@example.com")
        expect(tokens["Attio.PersonPhoneNumber"]).toBe("+15551234567")
    })
})
