import { AxiosError } from "axios";

export function toHttpError(e: AxiosError): Error {
    if (e.code === "ECONNREFUSED") {
        return new Error(`Address '${e.request.path}' refused connection.`)
    } else if (e.response) {
        if (e.response.status === 404) {
            return new Error(`Request '${e.request.method} ${e.request.path}' failed with status 404 NOT FOUND.`)
        } else {
            return new Error(`Request '${e.request.method} ${e.request.path}' failed ` +
                `with status ${e.response.status} and data ${JSON.stringify(e.response.data)}.`);
        }
    } else {
        return new Error(`Unknown error: ` + e.message);
    }
}
