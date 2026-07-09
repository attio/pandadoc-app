import "event-target-polyfill"
import "yet-another-abortcontroller-polyfill"
import {QueryClient, QueryClientProvider, useSuspenseQuery} from "@tanstack/react-query"

export {useSuspenseQuery, QueryClientProvider}

export const queryClient = new QueryClient()
