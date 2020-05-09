import { IAttributeStore } from "./resolution/types";
import { AttestedAttr } from "./types";


export interface IOWAttributeRepository extends IAttributeStore {
    put(a: AttestedAttr): void
}