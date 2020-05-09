import { IOWAttributeRepository } from "../../src/ow/IOWAttributeRepository";
import { AttestedAttr } from "../../src/ow/protocol/types";

export function mockRepo(attestedAttrs: AttestedAttr[]): IOWAttributeRepository {
    return {
        all: () => Promise.resolve(attestedAttrs),
        put: () => { },
    }
}