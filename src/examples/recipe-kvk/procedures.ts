import { Dict } from "../../types/Dict";
import { ProcedureConfig } from "../../types/types";
import { bsnToKvknrResolver } from "./resolvers/bsnToKvknr";

export const KVKProcedures: Dict<ProcedureConfig> = {
    p_kvknr: {
        desc: {
            title: {
                nl_NL: "KVK Nummer",
            },
            attributes: [{
                name: "kvknr",
                type: "id_metadata",
                title: {
                    nl_NL: "KVK Nummer"
                },
            }],
            procedure_name: "p_kvknr",
            requirements: ["bsn"],
        },
        resolver: bsnToKvknrResolver,
    },
};
