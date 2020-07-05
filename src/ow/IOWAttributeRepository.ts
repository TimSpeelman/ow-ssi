import { OWAttestedAttr } from "./protocol/types";
import { IAttributeStore } from "./resolution/types";


export interface IOWAttributeRepository extends IAttributeStore {
    put(a: OWAttestedAttr): Promise<void>
}