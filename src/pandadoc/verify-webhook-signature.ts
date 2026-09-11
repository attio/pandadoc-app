function toHex(bytes: ArrayBuffer): string {
    return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

// Constant-time string comparison — avoids leaking signature match length via timing.
function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false
    }

    let mismatch = 0
    for (let i = 0; i < a.length; i++) {
        mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }

    return mismatch === 0
}

// The signature travels as a `signature` query parameter, not a header.
// @see https://developers.pandadoc.com/docs/webhook-verification
export async function verifyPandadocWebhookSignature({
    rawBody,
    signature,
    sharedKey,
}: {
    rawBody: string
    signature: string | null
    sharedKey: string
}): Promise<boolean> {
    if (!signature) {
        return false
    }

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(sharedKey),
        {name: "HMAC", hash: "SHA-256"},
        false,
        ["sign"]
    )
    const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody))

    return timingSafeEqual(toHex(signatureBytes), signature)
}
