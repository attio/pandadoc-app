import {Workflows} from "attio/client"

export const documentStatusChangedOutcomeSchema = Workflows.OutcomeSchema.struct({
    document_id: Workflows.OutcomeSchema.string(),
    document_name: Workflows.OutcomeSchema.string(),
    recipient_emails: Workflows.OutcomeSchema.array(Workflows.OutcomeSchema.emailAddress()),
    date_completed: Workflows.OutcomeSchema.timestamp().optional(),
    date_modified: Workflows.OutcomeSchema.timestamp().optional(),
    deal_id: Workflows.OutcomeSchema.string().optional(),
    custom_object_slug: Workflows.OutcomeSchema.string().optional(),
    custom_object_record_id: Workflows.OutcomeSchema.string().optional(),
})
