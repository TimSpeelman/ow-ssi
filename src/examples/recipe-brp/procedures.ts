import { Dict } from "../../types/Dict";
import { ProcedureConfig } from "../../types/types";
import { bsnResolver } from "./resolvers/bsn";
import { passportResolver } from "./resolvers/passport";

export const BRPProcedures: Dict<ProcedureConfig> = {
    p_passport_nl: {
        desc: {
            title: {
                nl_NL: "Nederlands Paspoort",
            },
            attributes: [{
                name: "firstname",
                type: "id_metadata",
                title: {
                    nl_NL: "Voornaam"
                },
            }, {
                name: "lastname",
                type: "id_metadata",
                title: {
                    nl_NL: "Achternaam"
                },
            }, {
                name: "bsn",
                type: "id_metadata",
                title: {
                    nl_NL: "Burgerservicenummer"
                },
            }],
            procedure_name: "p_passport_nl",
            requirements: [],
        },
        resolver: passportResolver,
    },

    p_bsn: {
        desc: {
            title: {
                nl_NL: "Burgerservicenummer",
            },
            attributes: [{
                name: "bsn",
                type: "id_metadata",
                title: {
                    nl_NL: "Burgerservicenummer"
                },
            }],
            procedure_name: "p_bsn",
            requirements: [],
        },
        resolver: bsnResolver,
    },
};
