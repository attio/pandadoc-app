import {errored} from "@attio/fetchable"
import {afterEach, describe, expect, it, vi} from "vitest"

import {attioClient} from "./client"

function respondWith(status: number, body: unknown) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), {status})))
}

describe("attioClient", () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it("reports a 400 limit_reached as LIMIT_REACHED", async () => {
        respondWith(400, {type: "invalid_request_error", code: "limit_reached", message: "..."})

        expect(await attioClient.post("https://api.attio.com/v2/x", {})).toEqual(
            errored({code: "LIMIT_REACHED"})
        )
    })

    it("reports any other 400 as INVALID_REQUEST", async () => {
        respondWith(400, {type: "invalid_request_error", code: "validation_type", message: "..."})

        expect(await attioClient.post("https://api.attio.com/v2/x", {})).toEqual(
            errored({code: "INVALID_REQUEST"})
        )
    })
})
