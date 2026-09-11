import type {ZodError} from "zod"

function formatIssues(error: ZodError): string {
    return error.issues
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("; ")
}

export class InvalidSchemaError extends Error {
    constructor(error: ZodError) {
        super(`PandaDoc returned an invalid schema. ${formatIssues(error)}`)
        this.name = "InvalidSchemaError"
    }
}
