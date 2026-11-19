// QmlSource.js - Scan QML text into code, comment, string, and regular-expression regions, so tools can read its structure safely.
// Rules: Pure text analysis: no I/O, no process, no logging; every returned text keeps the length and line breaks of its input.
const regexKeywords = [
    "return",
    "typeof",
    "case",
    "do",
    "else",
    "in",
    "of",
    "delete",
    "void",
    "throw",
    "new",
    "yield",
    "await"
];

// Report whether a slash at the given index starts a regular expression, judged from the code before it.
function regexAllowed(text, index) {
    const before = text.slice(0, index).trimEnd();
    if (!before) return true;
    if (/[(,=:[!&|?{};+\-*%<>~^]$/.test(before)) return true;
    const word = /(\w+)$/.exec(before);
    return !!word && regexKeywords.includes(word[1]);
}

// Return the index just after the quoted text that starts at the given index, honouring backslash escapes.
function quotedEnd(text, start) {
    let index = start + 1;
    while (index < text.length) {
        if (text[index] === "\\") index += 2;
        else if (text[index] === text[start]) return index + 1;
        else index++;
    }
    return text.length;
}

// Return the index just after the regular expression literal that starts at the given index, including its flags.
function regexEnd(text, index) {
    let inClass = false;
    let position = index + 1;
    while (position < text.length && text[position] !== "\n") {
        if (text[position] === "\\") position += 2;
        else if (text[position] === "[") {
            inClass = true;
            position++;
        } else if (text[position] === "]") {
            inClass = false;
            position++;
        } else if (text[position] === "/" && !inClass)
            return position + 1 + /^[a-z]*/.exec(text.slice(position + 1))[0].length;
        else position++;
    }
    return index + 1;
}

// Label every character: "c" code, "k" comment, "s" string, "r" regular expression.
function regions(text) {
    const labels = new Array(text.length).fill("c");
    const label = (start, end, kind) => {
        for (let index = start; index < end; index++) labels[index] = kind;
    };
    let index = 0;
    while (index < text.length) {
        const current = text[index];
        const next = text[index + 1];
        if (current === "/" && next === "/") {
            const newline = text.indexOf("\n", index);
            const end = newline < 0 ? text.length : newline;
            label(index, end, "k");
            index = end;
        } else if (current === "/" && next === "*") {
            const closing = text.indexOf("*/", index + 2);
            const end = closing < 0 ? text.length : closing + 2;
            label(index, end, "k");
            index = end;
        } else if (current === '"' || current === "'" || current === "`") {
            const end = quotedEnd(text, index);
            label(index, end, "s");
            index = end;
        } else if (current === "/" && regexAllowed(text, index)) {
            const end = regexEnd(text, index);
            label(index, end, "r");
            index = end;
        } else index++;
    }
    return labels;
}

// Return the text with every non-code character, and every import or pragma line, replaced by spaces; indexes stay the same.
function maskedStructure(text) {
    const labels = regions(text);
    const characters = text.split("");
    for (let index = 0; index < characters.length; index++)
        if (labels[index] !== "c" && characters[index] !== "\n") characters[index] = " ";
    return characters.join("").replace(/^[ \t]*(?:import|pragma)\b[^\n]*/gm, (line) => " ".repeat(line.length));
}

// Return the text with comments removed and everything else kept; used to compare code without its comments.
function withoutComments(text) {
    const labels = regions(text);
    let output = "";
    for (let index = 0; index < text.length; index++) if (labels[index] !== "k") output += text[index];
    return output;
}

// Return the index of the brace that closes the one at the given index in masked text, or -1 when it is never closed.
function closingBrace(masked, open) {
    let depth = 0;
    for (let index = open; index < masked.length; index++) {
        if (masked[index] === "{") depth++;
        else if (masked[index] === "}" && --depth === 0) return index;
    }
    return -1;
}

module.exports = { regions, maskedStructure, withoutComments, closingBrace };
