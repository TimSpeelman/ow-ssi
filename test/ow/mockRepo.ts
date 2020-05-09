import { OWAttributeRepository } from "../../src/ow/OWAttributeRepository";
import { AttestedAttr } from "../../src/ow/types";

export function mockRepo(attestedAttrs: AttestedAttr[]): OWAttributeRepository {
    return {
        all: () => Promise.resolve(attestedAttrs)
    }
}