import { Dict } from '../types/Dict'

export class CallbackDict<T extends CallableFunction> {
    private dict: Dict<T[]> = {}
    public register(label: string, fn: T) {
        if (!(label in this.dict)) {
            this.dict[label] = []
        }
        this.dict[label].push(fn)
    }
    public call(label: string): T {
        // @ts-ignore
        return (...args: any[]) => {
            const fns = this.dict[label] || []
            this.dict[label] = []
            fns.forEach(fn => {
                fn(...args)
            })
        }
    }
}
