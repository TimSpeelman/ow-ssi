import { Dict } from '../types/Dict'

export function mapValues<T extends Dict<any>, S>(
    obj: T,
    map: <K extends keyof T>(elem: T[K], key: K) => S
): Dict<S> {
    const result: Dict<S> = {}
    Object.keys(obj).forEach(key => {
        result[key] = map(obj[key], key)
    })
    return result
}
