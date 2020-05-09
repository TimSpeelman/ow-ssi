import { ServerDescriptor } from "../../recipe/server/IAttestationServerRESTAPI";
import { mapValues } from "../../util/mapValues";
import { kvkServerPeer } from "./config";
import { KVKProcedures } from "./procedures";

export const KVKDescription: ServerDescriptor = {
    id: "kvk",
    url: `http://localhost:${kvkServerPeer.rest_port}`,
    logo_url: "https://statisch.ondernemersplein.kvk.nl/includes/downloads/KVK_logo_blauw_tcm106-423787.svg",
    mid_b64: kvkServerPeer.mid_b64,
    title: {
        nl_NL: "Kamer van Koophandel",
    },
    description: {
        nl_NL: "KVK biedt informatie, voorlichting en ondersteuning aan ondernemers"
            + " bij de belangrijkste thema’s op ondernemersgebied. Onze wettelijke taken"
            + " zijn gericht op het registreren, informeren en adviseren van ondernemers."
    },
    website: "https://www.kvk.nl",
    procedures: mapValues(KVKProcedures, (e) => e.desc),
};
