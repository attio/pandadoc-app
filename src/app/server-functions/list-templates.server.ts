import {isErrored, valueOrElse} from "@attio/fetchable"
import {listTemplates as listTemplatesResult} from "../../pandadoc/templates"
import type {PandadocTemplate} from "../../pandadoc/schemas"
import {createLogger} from "../../utils/logger"

const logger = createLogger("list-templates")

export default async function listTemplates(): Promise<Array<PandadocTemplate>> {
    const result = await listTemplatesResult()

    if (isErrored(result)) {
        logger.error("Failed to list templates", {error: result.error})
    }

    return valueOrElse(result, [])
}
