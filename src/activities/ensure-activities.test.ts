import {complete, errored} from "@attio/fetchable"
import {beforeEach, describe, expect, it, vi} from "vitest"

const {attioClient} = vi.hoisted(() => ({attioClient: {get: vi.fn(), post: vi.fn()}}))
vi.mock("../attio/client", () => ({attioClient}))

vi.mock("./activity-definitions", () => ({
    ACTIVITY_DEFINITIONS: [
        {
            apiSlug: "pandadoc_document_opens",
            singularNoun: "Document open",
            pluralNoun: "Document opens",
            extends: "activities",
            attributes: [
                {apiSlug: "document_url", title: "Document URL", description: "URL", type: "text"},
                {
                    apiSlug: "recipient",
                    title: "Recipient",
                    description: "Recipient",
                    type: "record-reference",
                    allowedObjects: ["people"],
                },
            ],
        },
    ],
}))

import {ensureActivities} from "./ensure-activities"

const postedSlugs = () =>
    attioClient.post.mock.calls.map(
        ([, body]) => (body as {data: {api_slug: string}}).data.api_slug
    )

describe(ensureActivities, () => {
    beforeEach(() => {
        attioClient.get.mockReset()
        attioClient.post.mockReset()
        attioClient.post.mockResolvedValue(complete({}))
    })

    it("creates the activity and all its attributes when the activity is missing", async () => {
        attioClient.get
            .mockResolvedValueOnce(errored({code: "NOT_FOUND"}))
            .mockResolvedValueOnce(complete({data: [{api_slug: "timestamp"}]}))

        await ensureActivities()

        expect(postedSlugs()).toEqual(["pandadoc_document_opens", "document_url", "recipient"])
    })

    it("only creates the attributes an existing activity is missing", async () => {
        attioClient.get
            .mockResolvedValueOnce(complete({data: {}}))
            .mockResolvedValueOnce(complete({data: [{api_slug: "document_url"}]}))

        await ensureActivities()

        expect(postedSlugs()).toEqual(["recipient"])
    })

    it("limits a record reference attribute to its allowed objects", async () => {
        attioClient.get
            .mockResolvedValueOnce(complete({data: {}}))
            .mockResolvedValueOnce(complete({data: [{api_slug: "document_url"}]}))

        await ensureActivities()

        expect(attioClient.post.mock.calls[0][1]).toMatchObject({
            data: {
                type: "record-reference",
                config: {record_reference: {allowed_objects: ["people"]}},
            },
        })
    })

    it("creates nothing when the activity can't be read for a reason other than not found", async () => {
        attioClient.get.mockResolvedValueOnce(errored({code: "FORBIDDEN"}))

        await ensureActivities()

        expect(attioClient.post).not.toHaveBeenCalled()
    })
})
