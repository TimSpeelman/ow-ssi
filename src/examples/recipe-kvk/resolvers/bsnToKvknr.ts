import { OWVerifyResponse } from "../../../ow/protocol/types";
import { RecipeResolver } from "../../../recipe/RecipeServer";
import { Credential } from '../../../types/types';
import { Database } from '../../../util/Database';

const db = new Database({
    2168897456: '6055221',
    3598846111: '4655999'
})
const BSN_ATTR_NAME = 'bsn'
const KVKNR_ATTR_NAME = 'kvknr'

export const bsnToKvknrResolver: RecipeResolver = (vResp: OWVerifyResponse) => {
    const credentials: Credential[] = vResp.attributes.map(a => ({
        attribute_hash: a.hash,
        attribute_name: a.ref, // fixme
        attribute_value: a.value,
    }))
    const bsn = credentials.find(c => c.attribute_name === BSN_ATTR_NAME)
    if (!bsn) {
        throw new Error('Cannot resolve without BSN')
    }
    // Simply derive from BSN for mocking purposes
    const kvknr = reverse(bsn.attribute_value.substr(1))
    return Promise.resolve([{ attribute_name: KVKNR_ATTR_NAME, attribute_value: kvknr }]);

    // Database approach
    // return db.get(bsn.attribute_value).then(val => [
    //     {
    //         attribute_name: KVKNR_ATTR_NAME,
    //         attribute_value: val
    //     }
    // ])
}

function reverse(str: string) { return str.split("").reverse().join(""); }
