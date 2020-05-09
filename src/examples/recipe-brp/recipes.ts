import { RecipeConfiguration } from "../../recipe/RecipeServer";
import { Dict } from "../../types/Dict";
import { bsnResolver } from "./resolvers/bsn";
import { passportResolver } from "./resolvers/passport";

export const BRPRecipes: Dict<RecipeConfiguration> = {
    p_passport_nl: {
        recipe: {
            title: {
                nl_NL: "Nederlands Paspoort",
            },
            attributes: [{
                name: "firstname",
                format: "id_metadata",
                title: {
                    nl_NL: "Voornaam"
                },
            }, {
                name: "lastname",
                format: "id_metadata",
                title: {
                    nl_NL: "Achternaam"
                },
            }, {
                name: "bsn",
                format: "id_metadata",
                title: {
                    nl_NL: "Burgerservicenummer"
                },
            }],
            name: "p_passport_nl",
        },
        resolver: passportResolver,
    },

    p_bsn: {
        recipe: {
            title: {
                nl_NL: "Burgerservicenummer",
            },
            attributes: [{
                name: "bsn",
                format: "id_metadata",
                title: {
                    nl_NL: "Burgerservicenummer"
                },
            }],
            name: "p_bsn",
        },
        resolver: bsnResolver,
    },
};
