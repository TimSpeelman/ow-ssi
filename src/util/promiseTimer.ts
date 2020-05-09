export function promiseTimer(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}
