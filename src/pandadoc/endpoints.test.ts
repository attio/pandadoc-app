import {describe, expect, it} from "vitest"
import {endpoints} from "./endpoints"

describe(endpoints.contactsByEmail, () => {
    it("percent-encodes special characters in the email", () => {
        expect(endpoints.contactsByEmail("user+test@example.com")).toBe(
            "https://api.pandadoc.com/public/v1/contacts?email=user%2Btest%40example.com"
        )
    })
})

describe(endpoints.documentsByMetadata, () => {
    it("percent-encodes special characters in the metadata value", () => {
        expect(
            endpoints.documentsByMetadata({metadataKey: "deal_id", metadataValue: "abc/def"})
        ).toBe("https://api.pandadoc.com/public/v1/documents?metadata_deal_id=abc%2Fdef")
    })
})
