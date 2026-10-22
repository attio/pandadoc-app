export type AttioApiError =
    | {code: "NOT_FOUND"}
    | {code: "UNAUTHORIZED"}
    | {code: "FORBIDDEN"}
    | {code: "INVALID_REQUEST"}
    | {code: "CONFLICT"}
    | {code: "RATE_LIMITED"}
    | {code: "ATTIO_API_ERROR"}
    | {code: "UNEXPECTED_ERROR"}
