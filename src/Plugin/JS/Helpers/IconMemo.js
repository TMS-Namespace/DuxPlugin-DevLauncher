// IconMemo.js - A bounded memory for composed icons, so a repeated result reuses the icon already built.
.pragma library
// Rules: Pure memo helper over an object the caller owns: no QML types, no logging, no I/O.

// Remember one value under its key, dropping the oldest remembered keys once the limit is passed, so the memory stays bounded.
function rememberBounded(memo, order, key, value, limit) {
    if (!Object.prototype.hasOwnProperty.call(memo, key)) {
        order.push(key);
        while (order.length > limit) delete memo[order.shift()];
    }
    memo[key] = value;
    return memo;
}
