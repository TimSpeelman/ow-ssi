import { Validate } from '../../util/validate';

const { many, hasKey, arrayWithEach, atKey } = Validate

export const Validation = {
    initiate: many([
        hasKey('procedure_id'),
        hasKey('mid_b64'),
        hasKey('credentials'),
        atKey(
            'credentials',
            arrayWithEach(
                many([
                    hasKey('attribute_name'),
                    hasKey('attribute_value'),
                    hasKey('attribute_hash'),
                ])
            )
        )
    ]),
    staged: hasKey('mid_b64')
}
