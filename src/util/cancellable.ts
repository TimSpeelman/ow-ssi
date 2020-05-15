import { Hook } from "./Hook";

export function cancelAfter<T extends Cancellable<any>>(millis: number): (c: T) => T {
    return function (c: T) {
        setTimeout(() => c.cancel(), millis);
        return c;
    }
}

export function cancellable<T>(func: CancellableFunction<T>): Cancellable<T> {

    // fire a hook if the consumer cancels
    const hook = new Hook();
    const cancel = () => hook.fire(true);
    const setCancelHandler = (handler: CancelHandler) => hook.on(handler);

    // make the promise
    const promise = func(setCancelHandler)

    return { promise, cancel };
}

type CancelHandler = (callback: () => void) => void;

export type CancellableFunction<T> = (setCancelHandler: CancelHandler) => Promise<T>;

export interface Cancellable<T> {
    promise: Promise<T>;
    cancel: () => void;
}
