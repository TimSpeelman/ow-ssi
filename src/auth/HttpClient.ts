import Axios from "axios";
import { OWVerifiee } from "../ow/protocol/OWVerifiee";
import { OWVerifyRequest, OWVerifyResponse } from "../ow/protocol/types";

export class VerifyHttpClient {

    constructor(
        protected verifieeService: OWVerifiee,
    ) { }

    getVerifyRequest(url: string): Promise<OWVerifyRequest> {
        return Axios.post(url).then(res => res.data).catch((e) => {
            console.error("Could not get VerifyRequest");
            throw e;
        });
    }

    verifyMe(request: OWVerifyRequest, response: OWVerifyResponse, timeout = 3000) {
        const validUntil = Date.now() + 10000;

        const verifResult = this.verifieeService.allowVerification(request, validUntil);
        const submitResult = Axios.post(request.http_return_address, {
            response,
        }).then(res => res.data).catch((e) => {
            console.error("Could not submit VerifyResponse");
            throw e;
        });;

        return new Promise(async (resolve, reject) => {
            let ok = false;
            setTimeout(() => !ok ? reject(new Error("Timeout")) : null, timeout);

            // send response and uuid to server, receives validation result.
            return Promise.all([
                verifResult,
                submitResult,
            ]).then(resolve).catch(reject);
        })
    }

}
