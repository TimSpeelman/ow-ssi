import { OWAPI } from "../api/OWAPI";
import { IOWAttributeRepository } from "../IOWAttributeRepository";
import { OWAttestedAttr } from "../protocol/types";

/** Uses the backend attribute storage */
export class AttributeRepository implements IOWAttributeRepository {

    constructor(protected api: OWAPI) { }

    public put(a: OWAttestedAttr) {
        return this.api.storeAttribute(a).then(() => { });
    }

    public all(): Promise<OWAttestedAttr[]> {
        return this.api.listAttributes();
    }
}
