import Axios from "axios";
import { OWVerifiee } from "../ow/protocol/OWVerifiee";
import { OWVerifyRequest, OWVerifyResponse } from "../ow/types";

export class VerifyHttpClient {

    constructor(
        protected verifieeService: OWVerifiee,
    ) { }

    getVerifyRequest(url: string): Promise<OWVerifyRequest> {
        return Axios.get(url).then(res => res.data).catch((e) => {
            console.error("Could not get VerifyRequest");
            throw e;
        });
    }

    verifyMe(uuid: string, request: OWVerifyRequest, response: OWVerifyResponse) {
        const validUntil = Date.now() + 10000;

        const verifResult = this.verifieeService.allowVerification(request, validUntil);
        const submitResult = Axios.post(request.http_return_address, {
            uuid,
            response,
        }).then(res => res.data).catch((e) => {
            console.error("Could not submit VerifyResponse");
            throw e;
        });;

        // send response and uuid to server, receives validation result.
        return Promise.all([
            verifResult,
            submitResult,
        ]);
    }

}
