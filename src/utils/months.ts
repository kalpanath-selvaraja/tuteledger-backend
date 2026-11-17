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

export const listMonths = (from: string, to: string): string[] => {
    const months: string[] = []

    let year = Number(from.slice(0, 4))
    let month = Number(from.slice(5, 7))

    // Months compare as plain text, so "2026-09" < "2026-10" works.
    // The 600 limit is a safety stop so it  never loop forever.
    while (months.length < 600) {
        const label = String(year) + "-" + String(month).padStart(2, "0")

        if (label > to) {
            break
        }

        months.push(label)

        month = month + 1
        if (month > 12) {
            month = 1
            year = year + 1
        }
    }

    return months
}