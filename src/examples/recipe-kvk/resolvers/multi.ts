import { AttributeResolver, Credential } from '../../../types/types'
import { Database } from '../../../util/Database'

const db = new Database({
    bsn1: { kvk_att1: 'kvk1x1', kvk_att2: 'kvk2x1' },
    bsn2: { kvk_att1: 'kvk1x2', kvk_att2: 'kvk2x2' }
})
const BSN_ATTR_NAME = 'bsn'

export const multiResolver: AttributeResolver = (credentials: Credential[]) => {
    const bsn = credentials.find(c => c.attribute_name === BSN_ATTR_NAME)
    if (!bsn) {
        throw new Error('Cannot resolve without BSN')
    }
    return db
        .get(bsn.attribute_value)
        .then(val =>
            Object.entries(val).map(([attribute_name, attribute_value]) => ({
                attribute_name,
                attribute_value
            }))
        )
}
