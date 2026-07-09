import {callPandadocApi} from "./call-pandadoc-api"
import {contactsResponseSchema, documentsResponseSchema, type PandadocDocument} from "./schemas"

export default async function getDocumentsByEmails(
    emails: string[]
): Promise<Array<PandadocDocument>> {
    if (emails.length === 0) {
        return []
    }

    const contactsResponse = await Promise.all(
        emails.map(async (email) => {
            const contactResponse = await callPandadocApi({
                path: `contacts?email=${email}`,
                method: "GET",
            })

            return contactsResponseSchema.parse(contactResponse).results
        })
    )

    const contacts = contactsResponse.flat()

    const documents = await Promise.all(
        contacts.map(async (contact) => {
            const documentsResponse = await callPandadocApi({
                path: `documents?contact_id=${contact.id}`,
                method: "GET",
            })

            return documentsResponseSchema.parse(documentsResponse).results
        })
    )

    return documents.flat()
}
