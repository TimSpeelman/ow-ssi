import { Attribute } from "../ipv8/services/types/Attribute";
import { Dict } from "./Dict";

export interface ServerId {
    http_address: string;
    mid_b64: string;
}

export interface PeerId {
    mid_b64: string;
}

export interface Credential {
    attribute_name: string;
    attribute_value: string;
    attribute_hash: string;
}

export interface ProcedureDescription {
    procedure_name: string;
    title: Dict<string>;
    requirements: string[];
    attributes: AttributeDescription[];
}

export interface AttributeDescription {
    name: string;
    title: Dict<string>;
    format: string;
}

export interface ProcedureConfig {
    desc: ProcedureDescription;
    resolver: AttributeResolver;
}

export type AttributeResolver = (credentials: Credential[]) => Promise<Attribute[]>;

export interface ProviderDesc {
    id: ServerId;
    procedures: Dict<ProcedureDescription>;
}

export interface ClientProcedure {
    desc: ProcedureDescription;
    server: ServerId;
}
