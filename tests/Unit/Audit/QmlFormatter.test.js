// QmlFormatter.test.js - Check that QML formatting keeps nested functions, try/finally, numbers, and pragmas, and that the verifier rejects each known qmlformat defect.
// Rules: Runs in plain node with the formatter's own temporary files; every changed result must still verify against its original.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { formatQmlStable } = require("../../../audit/QmlFormatter.js");
const { verifyQml } = require("../../../audit/QmlVerifier.js");

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "dev-launcher-format-"));
try {
    const file = path.join(directory, "Sample.qml");
    const sample = [
        "// Sample.qml - Formatter fixture.",
        "pragma Singleton",
        "import QtQuick",
        "QtObject {",
        "    property var big: 1700000100000",
        '    property var text: "keeps 1700000100000"',
        "    function run(items) {",
        "        for (const item of items) {",
        "            function complete(result) { return result + item; }",
        '            try { step(Number("1700000100") * 1000); } catch (error) { report(error); } finally { cleanup(item); }',
        "            complete(1);",
        "        }",
        "    }",
        "}",
        ""
    ].join("\n");
    fs.writeFileSync(file, sample);
    const formatted = formatQmlStable(file, sample);
    assert.deepEqual(verifyQml(sample, formatted), [], "formatting changed the meaning of the sample");
    assert.ok(formatted.includes("pragma Singleton"), "the pragma line must come back");
    assert.ok(
        formatted.includes("1700000100000") && formatted.includes('"keeps 1700000100000"'),
        "numbers must keep their text"
    );
    const loopAt = formatted.indexOf("for (const item of items)");
    assert.ok(
        loopAt > 0 && formatted.indexOf("function complete(result)") > loopAt,
        "the nested function must stay inside its loop"
    );
    assert.equal(formatQmlStable(file, formatted), formatted, "a second formatting pass must not change the result");

    // The verifier must reject each defect this qmlformat build has been seen to produce.
    const movedFunction = sample
        .replace("            function complete(result) { return result + item; }\n", "")
        .replace(
            "        for (const item of items) {",
            "        function complete(result) { return result + item; }\n        for (const item of items) {"
        );
    assert.ok(verifyQml(sample, movedFunction).length > 0, "a moved nested function must be rejected");
    assert.ok(
        verifyQml(sample, sample.replace("1700000100000", "1.7e+12")).length > 0,
        "a rewritten number must be rejected"
    );
    const copiedFinally = sample.replace(
        "finally { cleanup(item); }",
        'finally { step(Number("1700000100") * 1000); }'
    );
    assert.ok(verifyQml(sample, copiedFinally).length > 0, "a finally body copied from the try body must be rejected");
    console.log("QmlFormatter tests passed");
} finally {
    fs.rmSync(directory, { recursive: true, force: true });
}
