import type {App} from "attio"

import {createDealsDocumentAction} from "./deals/create-document-action"
import {dealsDocumentsWidget} from "./deals/documents-widget"
import {viewDealsDocumentsAction} from "./deals/view-documents-action"
import {createPeopleDocumentAction} from "./people/create-document-action"
import {peopleDocumentsWidget} from "./people/documents-widget"
import {viewPeopleDocumentsAction} from "./people/view-documents-action"
import {customObjectsDocumentsWidget} from "./custom-objects/documents-widget"
import {createCustomObjectDocumentAction} from "./custom-objects/create-document-action"
import {viewCustomObjectDocumentsAction} from "./custom-objects/view-documents-action"

export const app: App = {
    record: {
        actions: [
            createDealsDocumentAction,
            viewDealsDocumentsAction,
            createPeopleDocumentAction,
            viewPeopleDocumentsAction,
            createCustomObjectDocumentAction,
            viewCustomObjectDocumentsAction,
        ],
        bulkActions: [],
        widgets: [dealsDocumentsWidget, peopleDocumentsWidget, customObjectsDocumentsWidget],
    },
    callRecording: {
        insight: {
            textActions: [],
        },
        summary: {
            textActions: [],
        },
        transcript: {
            textActions: [],
        },
    },
}
