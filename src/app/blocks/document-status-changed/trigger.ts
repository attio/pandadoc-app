import {Workflows} from "attio/server"
import block from "./block"
import {handleDocumentStatusChangedTrigger} from "./lib/handle-trigger"

export default Workflows.defineWorkflowBlockTrigger(block, handleDocumentStatusChangedTrigger)
