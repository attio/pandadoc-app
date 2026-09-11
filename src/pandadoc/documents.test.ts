import {complete, errored} from "@attio/fetchable"
import {beforeEach, describe, expect, it, vi} from "vitest"

const {getContactsByEmail} = vi.hoisted(() => ({getContactsByEmail: vi.fn()}))
vi.mock("./contacts", () => ({getContactsByEmail}))

const {pandadocApi} = vi.hoisted(() => ({pandadocApi: {get: vi.fn()}}))
vi.mock("./client", () => ({pandadocApi}))

import {getDocumentsByEmails} from "./documents"

describe(getDocumentsByEmails, () => {
    beforeEach(() => {
        getContactsByEmail.mockReset()
        pandadocApi.get.mockReset()
    })

    it("returns an empty array without calling the API when given no emails", async () => {
        const result = await getDocumentsByEmails([])

        expect(result).toEqual(complete([]))
        expect(getContactsByEmail).not.toHaveBeenCalled()
    })

    it("fetches documents for every contact resolved from the given emails", async () => {
        getContactsByEmail.mockResolvedValueOnce(
            complete([{id: "contact-1", email: "a@example.com"}])
        )
        pandadocApi.get.mockResolvedValueOnce(
            complete({
                statusCode: 200,
                data: {results: [{id: "doc-1", name: "Doc", status: "document.completed"}]},
            })
        )

        const result = await getDocumentsByEmails(["a@example.com"])

        expect(result).toEqual(complete([{id: "doc-1", name: "Doc", status: "document.completed"}]))
    })

    it("propagates a contacts lookup failure without calling documents", async () => {
        getContactsByEmail.mockResolvedValueOnce(
            errored({code: "SERVICE_API_ERROR", detail: "boom"})
        )

        const result = await getDocumentsByEmails(["a@example.com"])

        expect(result).toEqual(errored({code: "SERVICE_API_ERROR", detail: "boom"}))
        expect(pandadocApi.get).not.toHaveBeenCalled()
    })
})
