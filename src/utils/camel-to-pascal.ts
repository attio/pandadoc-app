export function camelCaseToPascalCase(str: string) {
    return str
        .split("_")
        .map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1).toLocaleLowerCase())
        .join("")
}
