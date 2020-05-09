import { OWAttestOffer, OWVerifyResponse } from "../../ow/protocol/types";
import { Dict } from "../../types/Dict";
import { ProcedureDescription } from '../../types/types';

/** The API endpoint paths */
export const paths: { [k in keyof IAttestationServerRESTAPI]: string } = {
    about: "/about",
    procedure: "/procedure",
}

/** We share a typescript interface between front and backend. */
export interface IAttestationServerRESTAPI {
    about: () => Promise<ServerDescriptor>
    procedure: (req: ReqProcedure) => Promise<{ offer: OWAttestOffer }>
}

export interface ServerDescriptor {
    id: string;
    mid_b64: string;
    url: string;
    /** Title for each language */
    title: Dict<string>;
    /** Description for each language */
    description: Dict<string>;
    website: string;
    logo_url: string;
    /** All available procedures at this provider */
    procedures: Dict<ProcedureDescription>;
}

export interface ReqProcedure {
    procedure_id: string
    mid_b64: string
    // credentials: Credential[]
    verify_response: OWVerifyResponse
}
