import { OWVerifyResponse } from "../ow/protocol/types";

/** The API endpoint paths */
export const paths: { [k in keyof IVerifyServerAPI]: string } = {
    getReference: "/referToVerifyRequest",
    getVerifyRequest: "/getVerifyRequest",
    verifyMe: "/verifyMe",
    getResult: "/result",
}

/** We share a typescript interface between front and backend. */
export interface IVerifyServerAPI {
    getReference: () => { type: "IntentToVerify", url: string, uuid: string };
    getVerifyRequest: (template: string) => void;
    verifyMe: (template: string, response: OWVerifyResponse) =>
        Promise<boolean>;
    getResult: (uuid: string) =>
        VerifyResult;
}

export interface VerifyResult {
    success: boolean;
    response?: OWVerifyResponse
}
