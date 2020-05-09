/**
 * Tiny Validator utility.
 */
export type Validator = (d: any) => string | false

const V = {
    optional: (rule?: Validator) => (d: any) => d === undefined ? false : rule && rule(d),
    /** Checks a series of rules, returns the first error (or false if none) */
    many: (rules: Validator[]) => (d: any): string | false =>
        rules.reduce((err, rule) => (err ? err : rule(d)), false),

    bool: (d: any) => (d === true || d === false ? false : 'Expected value to be of type boolean'),
    truthy: (d: any) => (d ? false : 'Expected value to be truthy'),
    object: (d: any) => (d instanceof Object ? false : 'Expected value to be an object'),
    array: (d: any) => (d instanceof Array ? false : 'Expected value to be an array'),
    number: (d: any) => (typeof d === 'number' ? false : 'Expected value to be a number'),
    string: (d: any) => (typeof d === 'string' ? false : 'Expected value to be a string'),
    hasKey: (key: string) =>
        V.many([V.object, (d: any) => (key in d ? false : `Expected object to have key '${key}'`)]),

    arrayWithEach: (validate: Validator) =>
        V.many([
            V.array,
            (d: any[]): string | false => {
                const error = d.reduce((err, elem) => (err ? err : validate(elem)), false)
                return error ? `Invalid array element: ${error}` : false
            }
        ]),

    atKey: (key: string, validate: Validator) => (d: any) => {
        const error = validate(d[key])
        return error ? `At key ${key}: ${error}` : false
    }
}

export const Validate = V
