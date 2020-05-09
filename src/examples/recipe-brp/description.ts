import { RecipeServiceDescriptor } from "../../recipe/types";
import { mapValues } from "../../util/mapValues";
import { brpServerPeer } from "./config";
import { BRPRecipes } from "./recipes";

export const BRPDescription: RecipeServiceDescriptor = {
    id: "brp",
    url: `http://localhost:${brpServerPeer.rest_port}`,
    recipe_url: `http://localhost:${brpServerPeer.rest_port}/recipe`,
    logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Logo_rijksoverheid_met_beeldmerk.svg/1200px-Logo_rijksoverheid_met_beeldmerk.svg.png",
    mid_b64: brpServerPeer.mid_b64,
    title: {
        nl_NL: "Basisregistratie Personen",
    },
    description: {
        nl_NL: "De Basisregistratie Personen (BRP) bevat persoonsgegevens van"
            + " inwoners van Nederland (ingezetenen) en van personen die Nederland"
            + " hebben verlaten (niet ingezetenen)."
    },
    website: "https://www.rijksoverheid.nl/onderwerpen/privacy-en-persoonsgegevens/basisregistratie-personen-brp",
    recipes: mapValues(BRPRecipes, (e) => e.recipe),
};
