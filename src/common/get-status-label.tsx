import type {PandadocDocument} from "../pandadoc/schemas"

export function getStatusLabel(status: PandadocDocument["status"]) {
    switch (status) {
        case "document.uploaded":
            return "Uploaded"
        case "document.error":
            return "Error"
        case "document.draft":
            return "Draft"
        case "document.sent":
            return "Sent"
        case "document.viewed":
            return "Viewed"
        case "document.waiting_approval":
            return "Waiting Approval"
        case "document.rejected":
            return "Rejected"
        case "document.approved":
            return "Approved"
        case "document.waiting_pay":
            return "Waiting Payment"
        case "document.paid":
            return "Paid"
        case "document.completed":
            return "Completed"
        case "document.voided":
            return "Voided"
        case "document.declined":
            return "Declined"
        case "document.external_review":
            return "Edits Suggested"

        default:
            return "Unknown"
    }
}
