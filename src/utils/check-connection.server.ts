import {getUserConnection} from "attio/server"

/**
 * Check if the user has a connection to the app.
 * If not the function will throw specific connection error that will be caught by
 * the host.
 */
export default async function checkConnection() {
    await getUserConnection()
}
