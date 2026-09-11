import {createHmac} from "node:crypto"
import {describe, expect, it} from "vitest"
import {verifyPandadocWebhookSignature} from "./verify-webhook-signature"

describe(verifyPandadocWebhookSignature, () => {
    it("accepts a signature computed with the correct shared key", async () => {
        const sharedKey = "shared-secret"
        const rawBody = JSON.stringify([{event: "document_state_changed"}])
        const signature = createHmac("sha256", sharedKey).update(rawBody).digest("hex")

        await expect(verifyPandadocWebhookSignature({rawBody, signature, sharedKey})).resolves.toBe(
            true
        )
    })

    it("rejects a signature computed with the wrong shared key", async () => {
        const rawBody = JSON.stringify([{event: "document_state_changed"}])
        const signature = createHmac("sha256", "wrong-key").update(rawBody).digest("hex")

        await expect(
            verifyPandadocWebhookSignature({rawBody, signature, sharedKey: "shared-secret"})
        ).resolves.toBe(false)
    })
})
