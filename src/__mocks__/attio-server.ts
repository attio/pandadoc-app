export const getUserConnection = () => ({value: "user-token"})
export const getWorkspaceConnection = () => ({value: "workspace-token"})

const kvStore = new Map<string, {value: string}>()

export const kv = {
    get: async (key: string) => kvStore.get(key) ?? null,
    set: async (key: string, value: string, _options?: {ttlInSeconds?: number}) => {
        kvStore.set(key, {value})
    },
    delete: async (key: string) => {
        kvStore.delete(key)
    },
}
