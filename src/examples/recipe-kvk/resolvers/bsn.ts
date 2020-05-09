import { AttributeResolver } from '../../../types/types';

export const bsnResolver: AttributeResolver = () =>
    Promise.resolve([
        {
            attribute_name: 'bsn',
            attribute_value: Math.floor(Math.random() * 1000000000).toString(10),
        }
    ])

function coin() {
    return Math.random() > 0.5;
}

