import {Workflows} from "attio"
import {DOCUMENT_STATUSES} from "../../../pandadoc/document-status-options"

export default Workflows.defineWorkflowBlock({
    type: "trigger",
    id: "document-status-changed",
    title: "Document status changed",
    description: "Starts a run when a PandaDoc document changes to the selected status.",
    configSchema: Workflows.ConfigSchema.struct({
        status: Workflows.ConfigSchema.stringEnum([...DOCUMENT_STATUSES]),
        templateId: Workflows.ConfigSchema.string().optional(),
    }),
})
