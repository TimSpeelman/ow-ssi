
export function race<X extends Fn, Y extends Fn>(fnA: X, fnB: Y): [X, Y] {
    let called = false;
    const a = ((...args: any) => {
        if (called) return;
        called = true;
        return fnA(...args);
    }) as X

    const b = ((...args: any) => {
        if (called) return;
        called = true;
        return fnB(...args);
    }) as Y

    return [a, b];
}

type Fn = (...args: any) => any;
