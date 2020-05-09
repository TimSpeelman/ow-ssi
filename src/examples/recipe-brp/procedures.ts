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
                format: "id_metadata",
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
