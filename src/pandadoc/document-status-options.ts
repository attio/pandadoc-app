export const DOCUMENT_STATUSES = [
    "document.completed",
    "document.viewed",
    "document.declined",
    "document.sent",
    "document.voided",
] as const

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number]

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
    "document.completed": "Completed",
    "document.viewed": "Viewed",
    "document.declined": "Declined",
    "document.sent": "Sent",
    "document.voided": "Voided",
}
