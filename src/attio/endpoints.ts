const ATTIO_API_BASE_URL = "https://api.attio.com"

/**
 * Absolute URL builders for the Attio REST API.
 *
 * @see https://docs.attio.com/rest-api/guides/activities
 */
export const endpoints = {
    api: {
        activities: `${ATTIO_API_BASE_URL}/v2/activities`,

        activity: (activity: string) =>
            `${ATTIO_API_BASE_URL}/v2/activities/${encodeURIComponent(activity)}`,

        activityAttributes: (activity: string) =>
            `${ATTIO_API_BASE_URL}/v2/activities/${encodeURIComponent(activity)}/attributes`,

        activityRecords: (activity: string) =>
            `${ATTIO_API_BASE_URL}/v2/activities/${encodeURIComponent(activity)}/records`,
    },
} as const
