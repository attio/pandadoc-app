import {type AsyncResult, isErrored, map} from "@attio/fetchable"
import {createLogger} from "../utils/logger"
import {type PandadocApiError, pandadocApi} from "./client"
import {endpoints} from "./endpoints"
import {parseWith} from "./error"
import {type PandadocTemplate, templatesResponseSchema} from "./schemas"

const logger = createLogger("pandadoc templates")

/**
 * @see https://developers.pandadoc.com/reference/list-templates
 */
export async function listTemplates(): AsyncResult<PandadocTemplate[], PandadocApiError> {
    const responseResult = await pandadocApi.get(endpoints.templates, "workspace-connection")

    if (isErrored(responseResult)) {
        logger.error("Failed to list templates", {error: responseResult.error})
        return responseResult
    }

    return map(
        parseWith(templatesResponseSchema, responseResult.value.data),
        ({results}) => results
    )
}
