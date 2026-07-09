import {describe, expect, it} from "vitest"
import {camelCaseToPascalCase} from "./camel-to-pascal"

describe("camelCaseToPascalCase", () => {
    it("converts a single snake_case segment to PascalCase", () => {
        expect(camelCaseToPascalCase("deal_name")).toBe("DealName")
    })

    it("capitalises a single word", () => {
        expect(camelCaseToPascalCase("status")).toBe("Status")
    })

    it("normalises casing within each segment", () => {
        expect(camelCaseToPascalCase("CLOSE_DATE")).toBe("CloseDate")
    })

    it("returns an empty string unchanged", () => {
        expect(camelCaseToPascalCase("")).toBe("")
    })
})
