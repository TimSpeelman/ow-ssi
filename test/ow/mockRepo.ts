import { IOWAttributeRepository } from "../../src/ow/IOWAttributeRepository";
import { OWAttestedAttr } from "../../src/ow/protocol/types";

export function mockRepo(attestedAttrs: OWAttestedAttr[]): IOWAttributeRepository {
    const attributes = attestedAttrs.slice();
    return {
        all: () => Promise.resolve(attributes),
        put: async (a: OWAttestedAttr) => { attributes.push(a); },
    }
}