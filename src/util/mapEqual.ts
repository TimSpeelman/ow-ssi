
export function arrayContentsEqual<T>(as: T[], bs: T[]) {
    let bsRemaining = bs.slice();
    if (as.length !== bs.length) { return false; }
    for (const a of as) {
        bsRemaining = bsRemaining.filter(b => b !== a);
    }
    return bsRemaining.length === 0;
}
