import {beforeEach, describe, expect, it, vi} from "vitest"

const {callPandadocApi} = vi.hoisted(() => ({
    callPandadocApi: vi.fn(),
}))

vi.mock("./call-pandadoc-api", () => ({callPandadocApi}))

import getDocumentsByEmails from "./get-documents-by-emails.server"

describe(getDocumentsByEmails, () => {
    beforeEach(() => {
        callPandadocApi.mockReset()
    })

    it("percent-encodes emails containing a + before building the query string", async () => {
        callPandadocApi.mockResolvedValueOnce({results: []})

        await getDocumentsByEmails(["user+test@example.com"])

        expect(callPandadocApi).toHaveBeenCalledWith({
            path: "contacts?email=user%2Btest%40example.com",
            method: "GET",
        })
    })

    it("returns an empty array without calling the API when given no emails", async () => {
        const documents = await getDocumentsByEmails([])

        expect(documents).toEqual([])
        expect(callPandadocApi).not.toHaveBeenCalled()
    })
})
