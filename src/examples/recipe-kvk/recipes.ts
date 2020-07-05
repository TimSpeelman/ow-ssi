import { RecipeConfiguration } from "../../recipe/RecipeServer";
import { Dict } from "../../types/Dict";
import { kvkServerPeer } from "./config";
import { bsnToKvknrResolver } from "./resolvers/bsnToKvknr";

export const KVKRecipes: Dict<RecipeConfiguration> = {
    p_kvknr: {
        recipe: {
            name: "p_kvknr",
            service_endpoint: "",
            title: {
                nl_NL: "KVK Nummer",
            },
            attributes: [{
                name: "kvknr",
                format: "id_metadata",
                title: {
                    nl_NL: "KVK Nummer"
                },
            }],
            verify_request: {
                type: "OWVerifyRequest",
                verifier_id: kvkServerPeer.mid_b64, // TODO not so nice
                attributes: [
                    {
                        ref: "bsn",
                        name: "bsn",
                        format: "id_metadata",
                        include_value: true
                    },
                ]
            },
        },
        resolver: bsnToKvknrResolver,
    },
};
