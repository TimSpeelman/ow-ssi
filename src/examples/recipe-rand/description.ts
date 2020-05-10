import { RecipeServiceDescriptor } from "../../recipe/types";
import { mapValues } from "../../util/mapValues";
import { randServerPeer } from "./config";
import { RandRecipes } from "./recipes";

export const RandDescription: RecipeServiceDescriptor = {
    id: "rand",
    url: `http://localhost:${randServerPeer.rest_port}`,
    logo_url: "",
    mid_b64: randServerPeer.mid_b64,
    title: {
        nl_NL: "Random Number Service",
        en_US: "Random Number Service",
    },
    description: {
        nl_NL: "De Random Number Service wijst u een UUID versie 4 toe.",
        en_US: "The Random Number Service provides you with a UUID version 4.",
    },
    website: "https://randomnumberservice.com",
    recipes: mapValues(RandRecipes, (e) => e.recipe),
};
