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
    length: (min: number, max?: number) =>
        (d: any) => d.length < min ? `Expected length to be at least ${min}` :
            (max !== undefined && d.length > max) ? `Expected length to be at most ${max}` : false,
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
        return error ? `At key '${key}': ${error}` : false
    },
    objectWithEach: (validate: Validator) => V.many([
        V.object,
        (d: any): string | false => {
            const keys = Object.keys(d);
            return keys.reduce((err, key) => {
                if (err) return err;
                const e = validate(d[key]);
                return e ? `At key '${key}': ${e}` : false;
            }, false);
        }
    ])
}

export const Validate = V
