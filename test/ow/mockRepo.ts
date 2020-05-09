import { IOWAttributeRepository } from "../../src/ow/IOWAttributeRepository";
import { AttestedAttr } from "../../src/ow/protocol/types";

export function mockRepo(attestedAttrs: AttestedAttr[]): IOWAttributeRepository {
    const attributes = attestedAttrs.slice();
    return {
        all: () => Promise.resolve(attributes),
        put: (a: AttestedAttr) => { attributes.push(a); },
    }
}