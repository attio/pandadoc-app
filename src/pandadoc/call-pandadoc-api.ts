import {getUserConnection} from "attio/server"

export async function callPandadocApi({
    path,
    method,
    body,
}: {
    path: string
    method?: "GET" | "POST" | "PUT" | "DELETE"
    body?: Record<string, unknown>
}): Promise<unknown> {
    const userConnection = await getUserConnection()

    const response = await fetch(`https://api.pandadoc.com/public/v1/${path}`, {
        method: method ?? "GET",
        body: JSON.stringify(body),
        headers: {
            Authorization: `Bearer ${userConnection.value}`,
        },
    })

    if (!response.ok) {
        throw new Error(`Failed to call Pandadoc API: ${await response.text()}`)
    }

    return response.json()
}
