// StatBatchRules.js - Build batched stat commands for many paths, and read their modification times back.
.pragma library
.import "Config.js" as Config

// Split paths into groups no larger than the batch size, so one command never receives too many arguments.
function batches(paths, size) {
    const groups = [];
    for (let start = 0; start < paths.length; start += size) groups.push(paths.slice(start, start + size));
    return groups;
}

// NUL separates timestamp/path fields, so tabs and newlines in names remain intact.
// Arguments follow --. The caller runs the process with LC_ALL=C, so diagnostics use a fixed language.
function command(paths) {
    return ["timeout", Config.statBatchTimeout, "stat", "--printf=%Y\\0%n\\0", "--"].concat(paths);
}

// Read complete NUL-delimited timestamp/path pairs; a partial final record is ignored.
function parse(output) {
    const fields = String(output || "").split("\u0000");
    const modified = {};
    for (let i = 0; i + 2 < fields.length; i += 2) {
        if (!/^-?\d+$/.test(fields[i]) || !fields[i + 1]) continue;
        modified[fields[i + 1]] = Number(fields[i]) * 1000;
    }
    return modified;
}

// Decode only the quoting emitted by GNU diagnostics; no diagnostic text is ever executed.
// Octal bytes are decoded together as UTF-8, including non-ASCII characters split across segments.
function diagnosticPath(quoted) {
    let remaining = quoted;
    let encoded = "";
    while (remaining) {
        const segment = /^(?:'([^']*)'|"((?:\\.|[^"\\])*)"|\$'((?:\\.|[^'\\])*)'|\\(.))/.exec(remaining);
        if (!segment) return "";
        const plain = segment[1] !== undefined ? segment[1] : segment[4];
        if (plain !== undefined) encoded += encodeURIComponent(plain);
        else {
            const text = segment[2] !== undefined ? segment[2] : segment[3];
            const escapes = {
                n: "\n",
                r: "\r",
                t: "\t",
                a: "\u0007",
                b: "\b",
                f: "\f",
                v: "\u000b",
                e: "\u001b",
                "\\": "\\",
                "'": "'",
                '"': '"',
                $: "$",
                "`": "`"
            };
            let invalid = false;
            encoded += text.replace(/\\([0-7]{3}|.)|([^\\]+)/g, function (match, escape, literal) {
                if (literal !== undefined) return encodeURIComponent(literal);
                if (/^[0-7]{3}$/.test(escape)) return "%" + parseInt(escape, 8).toString(16).padStart(2, "0");
                if (Object.prototype.hasOwnProperty.call(escapes, escape)) return encodeURIComponent(escapes[escape]);
                invalid = true;
                return "";
            });
            if (invalid) return "";
        }
        remaining = remaining.slice(segment[0].length);
    }
    try {
        return decodeURIComponent(encoded);
    } catch (invalidEncoding) {
        return "";
    } // Malformed bytes never confirm absence.
}

// Only explicit absence diagnostics confirm a missing path. Permission failures, timeouts, and command failures do not.
// Unknown quoting formats are kept conservatively; diagnostics are compared as text and never executed.
function missingPaths(requested, modified, errorOutput, exitCode) {
    if (exitCode !== 1) return [];
    const lines = String(errorOutput || "").split("\n");
    const absent = lines.map(function (line) {
        const diagnostic = /^stat: cannot statx? (.*): (?:No such file or directory|Not a directory)$/.exec(line);
        return diagnostic ? diagnosticPath(diagnostic[1]) : "";
    });
    return requested.filter(function (path) {
        if (Object.prototype.hasOwnProperty.call(modified, path)) return false;
        if (absent.includes(path)) return true;
        return ["cannot stat", "cannot statx"].some(function (operation) {
            return ["'", '"'].some(function (quote) {
                const prefix = "stat: " + operation + " " + quote + path + quote + ": ";
                return (
                    lines.includes(prefix + "No such file or directory") || lines.includes(prefix + "Not a directory")
                );
            });
        });
    });
}
