import { IOWAttributeRepository } from "./IOWAttributeRepository";
import { OWAttestedAttr } from "./protocol/types";

export class OWMemoryAttributeRepository implements IOWAttributeRepository {
    constructor(protected attrs: OWAttestedAttr[] = []) { }
    all(): Promise<OWAttestedAttr[]> { return Promise.resolve(this.attrs) }

    put(a: OWAttestedAttr) { this.attrs.push(a); return Promise.resolve() }
}
