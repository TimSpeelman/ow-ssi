import { IPv8API } from '../../ipv8/api/IPv8API';
import { Attribute } from '../../ipv8/services/types/Attribute';
import { AttestationClientFactory } from '../../recipe/client/AttestationClientFactory';
import { Dict } from '../../types/Dict';
import { ClientProcedure, ProviderDesc } from '../../types/types';
import { mapValues } from '../../util/mapValues';
import { kvkServerPeer } from '../recipe-kvk/config';
import { KVKRecipes } from '../recipe-kvk/recipes';
import { clientPeer } from './config';

const providers: Dict<ProviderDesc> = {
    kvk: {
        id: {
            http_address: `http://localhost:${kvkServerPeer.rest_port}`,
            mid_b64: kvkServerPeer.mid_b64
        },
        procedures: mapValues(KVKRecipes, p => p.desc)
    }
}

function getProcedure(providerName: string, procedureId: string): ClientProcedure {
    if (!(providerName in providers)) {
        throw new Error(`Unknown provider ${providerName}.`)
    }

    const procedures = providers[providerName].procedures
    if (!(procedureId in procedures)) {
        throw new Error(`Unknown procedure ${procedureId}.`)
    }
    return {
        desc: procedures[procedureId],
        server: providers[providerName].id
    }
}

const clientId = {
    api: new IPv8API(clientPeer.ipv8_url),
    mid_b64: clientPeer.mid_b64
}

/** Cache of client's attributes */
const clientAttributes: Dict<string> = {}

async function run() {
    const config = {
        mid_b64: clientPeer.mid_b64,
        ipv8_url: clientPeer.ipv8_url
    }
    const factory = new AttestationClientFactory(config)
    const client = factory.create()

    const do_bsn = true
    const do_kvk = true

    if (do_bsn) {
        await executeProcedure('kvk', 'p_bsn')
    }
    if (do_kvk) {
        await executeProcedure('kvk', 'p_multi')
    }

    async function executeProcedure(providerName: string, procedureId: string) {
        await client
            .execute(getProcedure(providerName, procedureId), clientAttributes)
            .then(({ data, attestations }: any) => {
                data.forEach((attr: Attribute) => {
                    // @ts-ignore
                    clientAttributes[attr.attribute_name] = attr.attribute_value
                })
            })
        await clientId.api.listAttestations().then(atts => {
            console.log("Client's attestations:")
            console.log(atts)
        })
    }
}

run()
