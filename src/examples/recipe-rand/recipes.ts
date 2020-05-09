import uuid from "uuid/v4";
import { RecipeConfiguration } from "../../recipe/RecipeServer";
import { Dict } from "../../types/Dict";

export const RandRecipes: Dict<RecipeConfiguration> = {
    rand: {
        recipe: {
            name: "rand",
            title: {
                nl_NL: "Random Number",
                en_US: "Random Number",
            }, attributes: [{
                format: "id_metadata",
                name: "rand",
                title: {
                    nl_NL: "Random Number (uuidv4)",
                    en_US: "Random Number (uuidv4)",
                },
            }],
        },
        resolver: () => Promise.resolve([{
            attribute_name: "rand",
            attribute_value: uuid(),
        }]),
    },
};
