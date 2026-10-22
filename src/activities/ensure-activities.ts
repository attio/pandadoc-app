import {type AsyncResult, complete, isErrored} from "@attio/fetchable"
import {z} from "zod"
import {attioClient} from "../attio/client"
import {endpoints} from "../attio/endpoints"
import type {AttioApiError} from "../attio/error"
import {createLogger} from "../utils/logger"
import {ACTIVITY_DEFINITIONS, type ActivityDefinition} from "./activity-definitions"

const logger = createLogger("ensure activities")

const attributesResponseSchema = z.object({
    data: z.array(z.object({api_slug: z.string()})),
})

async function ensureActivity(definition: ActivityDefinition): AsyncResult<void, AttioApiError> {
    const existingResult = await attioClient.get(endpoints.api.activity(definition.apiSlug))

    if (isErrored(existingResult) && existingResult.error.code !== "NOT_FOUND") {
        return existingResult
    }

    if (isErrored(existingResult)) {
        const createdResult = await attioClient.post(endpoints.api.activities, {
            data: {
                api_slug: definition.apiSlug,
                singular_noun: definition.singularNoun,
                plural_noun: definition.pluralNoun,
                extends: definition.extends,
            },
        })

        if (isErrored(createdResult)) {
            return createdResult
        }
    }

    const attributesResult = await attioClient.get(
        endpoints.api.activityAttributes(definition.apiSlug),
        attributesResponseSchema
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
            }
        )

        if (isErrored(createdResult)) {
            return createdResult
        }
    }

    return complete(undefined)
}

/**
 * Creates any PandaDoc activity or attribute the workspace is missing. Safe to re-run, since
 * reconnecting PandaDoc runs it again.
 */
export async function ensureActivities(): Promise<void> {
    for (const definition of ACTIVITY_DEFINITIONS) {
        const result = await ensureActivity(definition)

        if (isErrored(result)) {
            logger.error(`Failed to set up the ${definition.apiSlug} activity`, {
                code: result.error.code,
            })
        }
    }
}
