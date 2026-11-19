// QmlFormatter.js - Format QML with qmlformat while keeping the constructs that this qmlformat build changes meaning of out of its reach.
// Rules: Nested function declarations and try/catch/finally statements are formatted apart and put back; numeric literals and
// pragma lines are protected while qmlformat runs; every placeholder must come back exactly once or the formatting is refused.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { maskedStructure, closingBrace } = require("./QmlSource.js");

const numberPattern = /(?<![\w$.])(?:0[xX][0-9a-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)(?![\w$.])/g;
let temporaryCount = 0;

// Fail with one message naming the file and the construct that could not be restored.
function refuse(file, detail) {
    throw new Error("QML formatting refused for " + file + ": " + detail);
}

// Run qmlformat on text written beside the original file, so the file's directory is the one qmlformat sees.
function runQmlFormat(directory, text) {
    temporaryCount++;
    const temporary = path.join(directory, ".formatter-" + process.pid + "-" + temporaryCount + ".qml");
    fs.writeFileSync(temporary, text);
    try {
        const result = spawnSync("qmlformat", [temporary], { encoding: "utf8" });
        if (result.status !== 0 || !result.stdout.trim())
            throw new Error("qmlformat exited with status " + result.status + " for a formatting pass");
        return result.stdout;
    } finally {
        fs.rmSync(temporary, { force: true });
    }
}

// Report whether the word starts at the given index and is not part of a longer identifier.
function wordAt(masked, index, word) {
    return (
        masked.startsWith(word, index) &&
        !/[\w$.]/.test(masked[index - 1] || "") &&
        !/[\w$]/.test(masked[index + word.length] || "")
    );
}

// Report whether the given index begins a statement: only white space, a semicolon, or a brace comes before it.
function statementStart(masked, index) {
    const before = masked.slice(0, index).trimEnd();
    return !before || /[;{}]$/.test(before);
}

// Classify the block opened by a brace as a function body, or as something else, from the text before it.
function blockKind(masked, open) {
    const boundary = Math.max(
        masked.lastIndexOf(";", open - 1),
        masked.lastIndexOf("{", open - 1),
        masked.lastIndexOf("}", open - 1)
    );
    const header = masked.slice(boundary + 1, open).trim();
    return /\bfunction\b\s*[\w$]*\s*\([^()]*\)\s*$/.test(header) ? "function" : "block";
}

// Read the try statement that starts at the given index, returning its end, or null when it has no finally block.
function tryStatementEnd(masked, index) {
    let position = index + 3;
    while (/\s/.test(masked[position] || "")) position++;
    if (masked[position] !== "{") return null;
    const tryClose = closingBrace(masked, position);
    if (tryClose < 0) return null;
    position = tryClose + 1;
    const catching = /^\s*catch\s*(?:\([^()]*\))?\s*\{/.exec(masked.slice(position));
    if (catching) {
        const catchClose = closingBrace(masked, position + catching[0].length - 1);
        if (catchClose < 0) return null;
        position = catchClose + 1;
    }
    const finalizing = /^\s*finally\s*\{/.exec(masked.slice(position));
    if (!finalizing) return null;
    const finallyClose = closingBrace(masked, position + finalizing[0].length - 1);
    return finallyClose < 0 ? null : finallyClose + 1;
}

// Find the outermost units to format apart: try statements with a finally block, and function declarations nested in a function.
function findUnits(masked) {
    const units = [];
    const stack = [];
    let index = 0;
    while (index < masked.length) {
        if (wordAt(masked, index, "try") && statementStart(masked, index)) {
            const end = tryStatementEnd(masked, index);
            if (end !== null) {
                units.push({ kind: "try", start: index, end: end });
                index = end;
                continue;
            }
        }
        if (wordAt(masked, index, "function") && statementStart(masked, index) && stack.includes("function")) {
            const open = masked.indexOf("{", index);
            const close = open < 0 ? -1 : closingBrace(masked, open);
            if (close > 0) {
                units.push({ kind: "function", start: index, end: close + 1 });
                index = close + 1;
                continue;
            }
        }
        if (masked[index] === "{") stack.push(blockKind(masked, index));
        else if (masked[index] === "}") stack.pop();
        index++;
    }
    return units;
}

// Replace every number literal with a placeholder, and keep the original text of each literal in order.
function protectNumbers(text) {
    const literals = [];
    let output = "";
    let last = 0;
    for (const match of maskedStructure(text).matchAll(numberPattern)) {
        literals.push(text.slice(match.index, match.index + match[0].length));
        output += text.slice(last, match.index) + "formatNumber" + (literals.length - 1);
        last = match.index + match[0].length;
    }
    return { text: output + text.slice(last), literals: literals };
}

// Indent every non-empty line of a text by the given prefix.
function indentText(text, prefix) {
    return text
        .split("\n")
        .map((line) => (line.trim() ? prefix + line : ""))
        .join("\n");
}

// Remove the given number of leading spaces from each line that has them.
function dedentText(text, count) {
    return text
        .split("\n")
        .map((line) => line.slice(Math.min(count, line.length - line.trimStart().length)))
        .join("\n");
}

// Format a list of QML members or statements by wrapping them in a dummy object, then return the members' own text.
function formatWrapped(file, inner, indent, wrapperLines) {
    const formatted = formatBody(
        file,
        "QtObject {\n" + wrapperLines.open + "\n" + inner + "\n" + wrapperLines.close + "\n}\n"
    );
    const lines = formatted.split("\n");
    const first = lines.findIndex((line) => line.includes(wrapperLines.marker));
    const outer = lines.length - 1 - [...lines].reverse().findIndex((line) => line.trim() === "}");
    // Lines between the marker and the wrapper's own closing brace; the try body wrapper also keeps its function's closing brace, which is dropped here.
    // Each trailing closing brace is found by searching backwards, because qmlformat may leave blank lines before it.
    let end = outer;
    for (let count = 0; count < wrapperLines.trailing; count++) {
        end--;
        while (end > first && lines[end].trim() !== "}") end--;
    }
    const between = lines.slice(first + 1, end);
    return dedentText(between.join("\n").replace(/^\n+|\s+$/g, ""), indent);
}

// Format the text of one unit that was cut out: a nested function, or a try statement and its bodies.
function formatUnit(file, unit, text) {
    const source = text.slice(unit.start, unit.end);
    if (unit.kind === "function") {
        return formatWrapped(file, source, 4, { open: "", close: "", marker: "QtObject {", trailing: 0 }).replace(
            /^\s+/,
            ""
        );
    }
    const structure = maskedStructure(source);
    const tryOpen = structure.indexOf("{");
    const tryClose = closingBrace(structure, tryOpen);
    const pieces = [{ head: "try", body: source.slice(tryOpen + 1, tryClose) }];
    let position = tryClose + 1;
    const catching = /^\s*catch\s*(\([^()]*\))?\s*\{/.exec(structure.slice(position));
    if (catching) {
        const catchOpen = position + catching[0].length - 1;
        const catchClose = closingBrace(structure, catchOpen);
        pieces.push({ head: "catch " + (catching[1] || "").trim(), body: source.slice(catchOpen + 1, catchClose) });
        position = catchClose + 1;
    }
    const finalizing = /^\s*finally\s*\{/.exec(structure.slice(position));
    const finallyOpen = position + finalizing[0].length - 1;
    pieces.push({ head: "finally", body: source.slice(finallyOpen + 1, closingBrace(structure, finallyOpen)) });
    const rendered = pieces.map((piece) => {
        const body = piece.body.trim()
            ? formatWrapped(file, piece.body, 8, {
                  open: "    function formatBody() {",
                  close: "    }",
                  marker: "function formatBody() {",
                  trailing: 1
              })
            : "";
        return piece.head + " {" + (body ? "\n" + indentText(body, "    ") : "");
    });
    return rendered.join("\n} ").concat("\n}");
}

// Format QML text that has no header comment and no pragma placeholders, and verify that every unit and number came back.
function formatBody(file, text) {
    const directory = path.dirname(file);
    const structure = maskedStructure(text);
    const units = findUnits(structure);
    let working = text;
    for (let index = units.length - 1; index >= 0; index--) {
        working = working.slice(0, units[index].start) + "formatUnit" + index + ";" + working.slice(units[index].end);
    }
    const numbers = protectNumbers(working);
    const formatted = runQmlFormat(directory, numbers.text);
    const unitPlaceholders = formatted.match(/^[ \t]*formatUnit\d+;[ \t]*$/gm) || [];
    if (unitPlaceholders.length !== units.length)
        refuse(file, "nested functions or try statements could not be restored");
    const numberPlaceholders = formatted.match(/formatNumber\d+/g) || [];
    if (numberPlaceholders.length !== numbers.literals.length) refuse(file, "numeric literals could not be restored");
    const unitTexts = units.map((unit) => formatUnit(file, unit, text));
    let output = formatted.replace(/^([ \t]*)formatUnit(\d+);[ \t]*$/gm, (match, indent, index) =>
        indentText(unitTexts[Number(index)], indent)
    );
    output = output.replace(/formatNumber(\d+)/g, (match, index) => numbers.literals[Number(index)]);
    return output;
}

// Format one QML file: keep its leading comment lines, format the rest, and restore its pragma lines.
function formatQml(file, source) {
    const lines = source.split("\n");
    let leading = 0;
    while (leading < lines.length && lines[leading].startsWith("//")) leading++;
    const comments = lines.slice(0, leading);
    const rest = lines.slice(leading).join("\n");
    const pragmas = [];
    const protectedRest = rest.replace(/^pragma\s[^\n]*$/gm, (line) => {
        pragmas.push(line);
        return "// formatPragmaPlaceholder" + (pragmas.length - 1);
    });
    const formatted = formatBody(file, protectedRest);
    const found = formatted.match(/\/\/ formatPragmaPlaceholder\d+/g) || [];
    if (found.length !== pragmas.length) refuse(file, "pragma lines could not be restored");
    const restored = formatted.replace(/\/\/ formatPragmaPlaceholder(\d+)/g, (match, index) => pragmas[Number(index)]);
    // qmlformat may leave a property's type on its own line; joining it to the name is a whitespace-only change.
    const body = restored
        .replace(/^\n+/, "")
        .replace(/\s+$/, "")
        .replace(/^([ \t]*(?:(?:readonly|default|required)\s+)*property\s+[\w.<>[\]]+)\n[ \t]*(?=\w+\s*:)/gm, "$1 ");
    return comments.concat([body]).join("\n") + "\n";
}

// The most formatting passes that may run on one file before its layout is treated as unstable.
const maxPasses = 6;

// Format a file repeatedly until its text stops changing, because qmlformat can move lines again on a second pass.
function formatQmlStable(file, source) {
    let current = source;
    for (let pass = 0; pass < maxPasses; pass++) {
        const next = formatQml(file, current);
        if (next === current) return current;
        current = next;
    }
    refuse(file, "the layout did not settle after " + maxPasses + " passes");
}

module.exports = { formatQml, formatQmlStable, findUnits, protectNumbers };
