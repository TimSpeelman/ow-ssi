import { OWVerifyResponse } from "../ow/protocol/types";

/** The API endpoint paths */
export const paths: { [k in keyof IVerifyServerAPI]: string } = {
    newSession: "/new-session",
    getRequest: "/get-request",
    verifyMe: "/verify-me",
    getResult: "/get-result",
}

/** We share a typescript interface between front and backend. */
export interface IVerifyServerAPI {
    newSession: () => Promise<{ redirectURL: string, resultURL: string }>;
    getRequest: (template: string) => Promise<void>;
    verifyMe: (template: string, response: OWVerifyResponse) =>
        Promise<boolean>;
    getResult: (uuid: string) =>
        Promise<VerifyResult>;
}

export interface VerifyResult {
    success: boolean;
    response?: OWVerifyResponse
}
