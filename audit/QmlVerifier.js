// QmlVerifier.js - Check that a formatted QML file still means what its original meant, and report every difference found.
// Rules: Pure comparison: no I/O, no process, no logging. Member order may change, but members, code, values, and imports may not.
const { regions, maskedStructure, withoutComments, closingBrace } = require("./QmlSource.js");

const numberPattern = /(?<![\w$.])(?:0[xX][0-9a-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)(?![\w$.])/g;

// Count each item of a list, so two lists can be compared without caring about their order.
function tally(items) {
    const counts = new Map();
    for (const item of items) counts.set(item, (counts.get(item) || 0) + 1);
    return counts;
}

// Return the text between the previous statement boundary and an opening brace, which tells what the brace opens.
function headerOf(masked, open) {
    const boundary = Math.max(
        masked.lastIndexOf(";", open - 1),
        masked.lastIndexOf("{", open - 1),
        masked.lastIndexOf("}", open - 1)
    );
    return masked.slice(boundary + 1, open).trim();
}

// Report whether an opening brace opens a QML object, which is a type name before the brace, rather than a code block.
function opensObject(masked, open) {
    const header = headerOf(masked, open);
    if (/[=(:,[]$/.test(header) || /\)$/.test(header)) return false;
    return /(?:^|[^\w.$])[A-Z][\w.]*$/.test(header);
}

// Read the name of the object type that opens at the given brace.
function typeOf(masked, open) {
    return /([A-Z][\w.]*)$/.exec(headerOf(masked, open))[1];
}

// Return the index of the first character at or after the given index that is not white space.
function nextNonBlank(masked, index) {
    let position = index;
    while (position < masked.length && /\s/.test(masked[position])) position++;
    return position;
}

// Return the member key of one object line, or null when the line does not start a member.
function memberKeys(line) {
    const trimmed = line.trim();
    const property = /^(?:(?:default|required|readonly)\s+)*property\s+[\w.<>[\]]+\s+(\w+)(\s*:)?/.exec(trimmed);
    if (property) return property[2] ? ["property:" + property[1], "bind:" + property[1]] : ["property:" + property[1]];
    const signal = /^signal\s+(\w+)/.exec(trimmed);
    if (signal) return ["signal:" + signal[1]];
    const fn = /^function\s+(\w+)/.exec(trimmed);
    if (fn) return ["function:" + fn[1]];
    const enumeration = /^enum\s+(\w+)/.exec(trimmed);
    if (enumeration) return ["enum:" + enumeration[1]];
    const binding = /^([a-z_$][\w$]*(?:\.[\w$]+)*)\s*:(?!:)/i.exec(trimmed);
    if (binding) return ["bind:" + binding[1]];
    const child = /^([A-Z][\w.]*)\s*\{/.exec(trimmed);
    if (child) return ["child:" + child[1]];
    return null;
}

// Describe a QML file as plain multisets: imports, pragmas, numbers, strings, code blocks, and object members with their owners.
function signature(text) {
    const masked = maskedStructure(text);
    const labels = regions(text);
    const lines = text.split("\n");
    const imports = lines.filter((line) => /^\s*import\b/.test(line)).map((line) => line.replace(/\s+/g, " ").trim());
    const pragmas = lines.filter((line) => /^\s*pragma\b/.test(line)).map((line) => line.replace(/\s+/g, " ").trim());
    const codeOnly = withoutComments(text);
    const numbers = [];
    for (const match of maskedStructure(codeOnly).matchAll(numberPattern)) numbers.push(match[0]);
    const strings = [];
    for (let index = 0; index < text.length; index++) {
        if (labels[index] !== "s") continue;
        let end = index;
        while (end < text.length && labels[end] === "s") end++;
        // A quoted identifier used as an object key means the same as the bare key, so it is not compared as a string.
        if (!/^\s*:(?!:)/.test(text.slice(end))) strings.push(text.slice(index, end));
        index = end - 1;
    }
    const blocks = [];
    const members = [];
    const stack = [];
    const lineStarts = [0];
    for (let index = 0; index < text.length; index++) if (text[index] === "\n") lineStarts.push(index + 1);
    // A member starts at a line start, after an object's opening brace, or after a statement end directly inside an object.
    const memberAt = new Set(lineStarts.map((start) => nextNonBlank(masked, start)));
    // Positions up to this index belong to a declaration already read, so they are not members of their own.
    let consumedUntil = 0;
    for (let index = 0; index < masked.length; index++) {
        const current = masked[index];
        const insideObject = stack.length > 0 && stack[stack.length - 1].isObject;
        if (current === "{") {
            const isObject = opensObject(masked, index);
            const type = isObject ? typeOf(masked, index) : "";
            const header = headerOf(masked, index);
            const counted = /\bfunction\b[^{}]*\)$/.test(header) || /:$/.test(header);
            stack.push({ isObject: isObject, type: type, open: index, counted: counted });
            if (isObject) memberAt.add(nextNonBlank(masked, index + 1));
        } else if (current === "}") {
            const frame = stack.pop();
            // Only function bodies and binding blocks are compared: if, loop, and try braces may be added around one statement.
            if (frame && !frame.isObject && frame.counted) blocks.push(codeText(text, frame.open, index));
        } else if (current === ";" && insideObject) memberAt.add(nextNonBlank(masked, index + 1));
        if (memberAt.has(index) && index >= consumedUntil && stack.length && stack[stack.length - 1].isObject) {
            let lineEnd = text.indexOf("\n", index) < 0 ? text.length : text.indexOf("\n", index);
            // A property whose type is on its own line has its name on the next line, so that line is read too.
            if (/\bproperty\s+[\w.<>[\]]+\s*$/.test(masked.slice(index, lineEnd))) {
                const next = text.indexOf("\n", lineEnd + 1);
                lineEnd = next < 0 ? text.length : next;
                consumedUntil = lineEnd;
            }
            const keys = memberKeys(masked.slice(index, lineEnd)) || [];
            const owner = stack
                .filter((frame) => frame.isObject)
                .map((frame) => frame.type)
                .join(">");
            for (const key of keys) members.push(owner + "|" + key);
        }
    }
    return {
        imports: tally(imports),
        pragmas: tally(pragmas),
        numbers: tally(numbers),
        strings: tally(strings),
        blocks: tally(blocks),
        members: tally(members)
    };
}

// The code of one block with comments and every kind of whitespace and semicolon removed, so layout changes do not count.
function codeText(text, start, end) {
    // Braces are dropped as well: qmlformat may wrap a single statement in braces, which keeps its meaning.
    return withoutComments(text.slice(start, end + 1))
        .replace(/"([A-Za-z_$][\w$]*)"(?=\s*:)/g, "$1")
        .replace(/[\s;{}]/g, "");
}

// Compare two signatures and describe each multiset item that is missing from one side or the other.
function differences(original, formatted) {
    const problems = [];
    for (const field of Object.keys(original)) {
        const before = original[field];
        const after = formatted[field];
        for (const [item, count] of before)
            if ((after.get(item) || 0) !== count) problems.push(field + " changed or missing: " + item.slice(0, 120));
        for (const [item, count] of after)
            if ((before.get(item) || 0) !== count) problems.push(field + " added: " + item.slice(0, 120));
    }
    return problems;
}

// Return the list of differences between an original QML text and its formatted version; an empty list means the meaning is kept.
function verifyQml(original, formatted) {
    return differences(signature(original), signature(formatted));
}

module.exports = { verifyQml, signature, differences };
