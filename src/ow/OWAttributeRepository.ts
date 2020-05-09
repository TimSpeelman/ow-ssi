import { IOWAttributeRepository } from "./IOWAttributeRepository";
import { AttestedAttr } from "./types";

export class OWAttributeRepository implements IOWAttributeRepository {
    constructor(protected attrs: AttestedAttr[] = []) { }
    all(): Promise<AttestedAttr[]> { return Promise.resolve(this.attrs) }

    put(a: AttestedAttr) { this.attrs.push(a) }
}
