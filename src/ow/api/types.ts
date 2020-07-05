import { Dict } from "../../types/Dict";

export interface OWAttribute {
    hash: string;
    name: string;
    value: string;
    time: number;
    type: string;
    title: Dict<string>;
    signer_mid_b64: string;
    metadata: any;
}
