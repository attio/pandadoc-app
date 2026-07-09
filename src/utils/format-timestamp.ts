const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
]

export function formatDate(date: Date) {
    const d = String(date.getDate()).padStart(2, "0")
    const m = MONTHS[date.getMonth()]
    const y = date.getFullYear()
    return `${d} ${m} ${y}`
}

export function formatTimestamp(timestamp: string) {
    return timestamp.split(".")[0].replace("T", " ")
}
