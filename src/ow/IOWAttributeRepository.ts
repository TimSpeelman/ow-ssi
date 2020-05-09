import { AttestedAttr } from "./types";


export interface IOWAttributeRepository {
    all(): Promise<AttestedAttr[]>

    put(a: AttestedAttr): void
}