import {Settings} from "attio/client"
import "./schema"
import schema from "./schema"

export default Settings.defineWorkspacePage(schema, () => {
    const {Form, Section, Toggle} = Settings.useForm(schema)

    return (
        <Form>
            <Section title="Document builder">
                <Toggle
                    label="Open documents in new tab"
                    name="openDocumentsInNewTab"
                    description="Turn this on if you prefer working in PandaDoc directly, or if your template has workflow steps such as collecting a payment, which can't run in the embedded document builder."
                />
            </Section>
        </Form>
    )
})
