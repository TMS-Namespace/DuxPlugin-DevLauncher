// FileMetadataRules.test.js - Check metadata cache and missing-path rules.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const fileMetadataRules = source("Helpers/FileMetadataRules.js");
const fileStatusRules = source("Helpers/FileStatusRules.js");
assert.equal(fileStatusRules.missing({ code: "ENOENT", error: "No such file or directory" }), true);
assert.equal(fileStatusRules.missing({ code: "EACCES", error: "Permission denied" }), false);
assert.equal(fileMetadataRules.cacheKey("/tmp/compose.yaml", "file"), fileMetadataRules.cacheKey("/tmp/compose1.YAML", "file"));
assert.notEqual(fileMetadataRules.cacheKey("/tmp/one", "folder"), fileMetadataRules.cacheKey("/tmp/two", "folder"));
assert.notEqual(fileMetadataRules.cacheKey("/tmp/Makefile", "file"), fileMetadataRules.cacheKey("/tmp/Dockerfile", "file"));
