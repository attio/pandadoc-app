import {type AsyncResult, complete, isErrored} from "@attio/fetchable"
import {z} from "zod"
import {attioClient} from "../attio/client"
import {endpoints} from "../attio/endpoints"
import type {AttioApiError} from "../attio/error"
import {createLogger} from "../utils/logger"
import {ACTIVITY_DEFINITIONS} from "./activity-definitions"

const logger = createLogger("ensure activities")

const attributesResponseSchema = z.object({
    data: z.array(z.object({api_slug: z.string()})),
})

/**
 * Creates whatever the workspace is missing of the activity with this slug, returning whether it
 * created any. Connecting PandaDoc sets up every activity, but a workspace that connected before
 * an activity was added, or whose setup timed out, gets it this way on its first event instead.
 */
export async function ensureActivity(
    apiSlug: string,
    signal?: AbortSignal
): AsyncResult<boolean, AttioApiError> {
    const definition = ACTIVITY_DEFINITIONS.find((candidate) => candidate.apiSlug === apiSlug)

    if (!definition) {
        return complete(false)
    }

    const existingResult = await attioClient.get(
        endpoints.api.activity(definition.apiSlug),
        undefined,
        {signal}
    )

    if (isErrored(existingResult) && existingResult.error.code !== "NOT_FOUND") {
        return existingResult
    }

    let createdAny = false

    if (isErrored(existingResult)) {
        const createdResult = await attioClient.post(
            endpoints.api.activities,
            {
                data: {
                    api_slug: definition.apiSlug,
                    singular_noun: definition.singularNoun,
                    plural_noun: definition.pluralNoun,
                    extends: definition.extends,
                },
            },
            undefined,
            {signal}
        )

        if (isErrored(createdResult)) {
            return createdResult
        }

        createdAny = true
    }

    const attributesResult = await attioClient.get(
        endpoints.api.activityAttributes(definition.apiSlug),
        attributesResponseSchema,
        {signal}
    )

    if (isErrored(attributesResult)) {
        return attributesResult
    }

    const existingSlugs = new Set(
        attributesResult.value.data.map((attribute) => attribute.api_slug)
    )

    for (const attribute of definition.attributes) {
        if (existingSlugs.has(attribute.apiSlug)) {
            continue
        }

        const createdResult = await attioClient.post(
            endpoints.api.activityAttributes(definition.apiSlug),
            {
                data: {
                    title: attribute.title,
                    description: attribute.description,
                    api_slug: attribute.apiSlug,
                    type: attribute.type,
                    is_required: false,
                    is_unique: false,
                    is_multiselect: false,
                    config:
                        attribute.type === "record-reference"
                            ? {record_reference: {allowed_objects: attribute.allowedObjects}}
                            : {},
                },
            },
            undefined,
            {signal}
        )

        if (isErrored(createdResult)) {
            return createdResult
        }

        createdAny = true
    }

    return complete(createdAny)
}

/**
 * Creates any PandaDoc activity or attribute the workspace is missing. Safe to re-run, since
 * reconnecting PandaDoc runs it again and only creates what's still missing. `signal` cancels
 * its requests and stops it before the next activity.
 */
export async function ensureActivities(signal?: AbortSignal): Promise<void> {
    for (const definition of ACTIVITY_DEFINITIONS) {
        if (signal?.aborted) {
            logger.log(`Stopped before setting up the ${definition.apiSlug} activity`)
            return
        }

        const result = await ensureActivity(definition.apiSlug, signal)

        if (isErrored(result)) {
            logger.error(`Failed to set up the ${definition.apiSlug} activity`, {
                code: result.error.code,
            })
        }
    }
}
