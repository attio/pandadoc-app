export const CUSTOM_OBJECT_METADATA_KEY = "attio.custom_object"

/** Splits a `<object slug>.<record id>` metadata value, as written by the create flow. */
export function splitCustomObjectMetadataValue(
    value: string
): {slug: string; recordId: string} | undefined {
    const separatorIndex = value.indexOf(".")

    if (separatorIndex === -1) {
        return undefined
    }

    return {
        slug: value.slice(0, separatorIndex),
        recordId: value.slice(separatorIndex + 1),
    }
}
