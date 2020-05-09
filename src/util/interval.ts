export function interval(ms: number) {
    return {
        subscribe: (fn: (step: number) => any): IntervalSubscription => {
            let i = 0
            const handle = setInterval(() => fn(i++), ms)
            return {
                unsubscribe: () => clearInterval(handle)
            }
        }
    }
}

export interface IntervalSubscription {
    unsubscribe: () => any
}
