import {Workflows, useAsyncCache} from "attio/client"
import {DOCUMENT_STATUSES, DOCUMENT_STATUS_LABELS} from "../../../pandadoc/document-status-options"
import listTemplates from "../../server-functions/list-templates.server"
import block from "./block"
import {documentStatusChangedOutcomeSchema} from "./lib/outcome-schema"

const STATUS_OPTIONS = DOCUMENT_STATUSES.map((status) => ({
    value: status,
    label: DOCUMENT_STATUS_LABELS[status],
}))

export default Workflows.defineConfigurator(block, (workflowBlock) => {
    const {ComboboxInput, Outcome} = Workflows.useConfigurator(workflowBlock)

    const {
        values: {templates},
    } = useAsyncCache({templates: listTemplates})

    const templateOptions = templates.map((template) => ({
        value: template.id,
        label: template.name,
    }))

    return (
        <>
            <ComboboxInput
                name="status"
                label="Status"
                disableVariables
                disableSearch
                placeholder="Select a status..."
                options={STATUS_OPTIONS}
            />
            <ComboboxInput
                name="templateId"
                label="Template"
                disableVariables
                placeholder="Any template (leave empty to match all)"
                searchPlaceholder="Search templates..."
                options={templateOptions}
            />
            <Outcome id="triggered" schema={documentStatusChangedOutcomeSchema} />
        </>
    )
})
