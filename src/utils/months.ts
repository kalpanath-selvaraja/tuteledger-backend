const MONTH_PATTERNS = /^\d{4}-(0[1-9]|1[0-2])$/;

export const isValidMonth = (value: unknown): value is string => {
    return typeof value === "string" && MONTH_PATTERNS.test(value)
}

export const getCurrentMonth = (now: Date = new Date()):string => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Colombo",
        year: "numeric",
        month: "2-digit",
    }).formatToParts(now);


    const year = parts.find((part) => part.type === "year")?.value
    const month = parts.find((part) => part.type === "month")?.value

    if (!year || !month) {
        throw new Error("Could not read the current month")
    }

    return `${year}-${month}`
}