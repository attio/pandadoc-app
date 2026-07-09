import type {PandadocDocument} from "../pandadoc/schemas"

const STATUS_COLORS = {
    "document.draft": "#FA4B94",
    "document.uploaded": "#FA4B94",
    "document.sent": "#266DF0",
    "document.viewed": "#00B9EB",
    "document.waiting_approval": "#F5A300",
    "document.waiting_pay": "#F5A300",
    "document.external_review": "#CDCFD1",
    "document.paid": "#02AD6E",
    "document.completed": "#00D17E",
    "document.approved": "#00D17E",
    "document.declined": "#FF5454",
    "document.error": "#FF5454",
    "document.voided": "#C95908",
    "document.rejected": "#FF5454",
} as const

export function getStatusColor(status: PandadocDocument["status"]) {
    return STATUS_COLORS[status]
}
