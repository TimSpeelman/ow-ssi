export function strlist(list: any[], none = 'none', sep = ',', last = ' and ') {
    const len = list.length
    switch (len) {
        case 0:
            return none
        case 1:
            return list[0]
        default:
            return `${list.slice(0, len - 1).join(sep)}${last}${list[len - 1]}`
    }
}
