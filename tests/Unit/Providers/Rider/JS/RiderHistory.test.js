// RiderHistory.test.js - Parse Rider's XML, local paths, timestamps, and malformed histories.
// Rules: Runs in plain node; malformed XML must be refused, and only Rider's own recent-projects component may supply paths.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const history = source("Providers/Rider/JS/RiderHistory.js");
const properties = { providerId: "provider", name: "Rider" };
const xml = `<?xml version="1.0"?><application><component name="RiderRecentProjectsManager"><option name="additionalInfo"><map>
<entry key="$USER_HOME$/Project &amp; 日本語"><value><RecentProjectMetaInfo><option name="projectOpenTimestamp" value="1700000000000" /></RecentProjectMetaInfo></value></entry>
<entry key="/tmp/a&#x20;b.sln"><value><RecentProjectMetaInfo><option name="projectOpenTimestamp" value="1600000000000" /></RecentProjectMetaInfo></value></entry>
</map></option></component></application>`;
const rows = history.records(xml, "/home/user", properties);
assert.equal(rows.length, 2);
assert.equal(rows[0].path, "/home/user/Project & 日本語");
assert.equal(rows[0].openedAt, 1700000000000);
assert.equal(rows[1].path, "/tmp/a b.sln");
assert.equal(rows[1].kind, "file");
assert.throws(() => history.records(xml.replace("</entry>", ""), "/home/user", properties));
assert.throws(() => history.records(xml.replace("&amp;", "&unknown;"), "/home/user", properties));
assert.throws(() => history.records(xml.replace('key="/tmp/a&#x20;b.sln"', 'key=/broken'), "/home/user", properties));
assert.throws(() => history.records('<!DOCTYPE application><application/>', "/home/user", properties));
assert.throws(() => history.records("<application/>", "/home/user", properties));

assert.throws(() => history.records(xml.replace("&amp;", "&broken"), "/home/user", properties));
const merged = history.merge([{ path: "/same", openedAt: 200 }, { path: "/same", openedAt: 100 }, { path: "/other", openedAt: 10 }]);
assert.equal(merged.length, 2);
assert.equal(merged.find(entry => entry.path === "/same").openedAt, 200);

// An unrelated JetBrains component must not leak its paths into Rider history.
const unrelated = '<application><component name="Other"><option name="additionalInfo"><map><entry key="/wrong"><value/></entry></map></option></component><component name="RiderRecentProjectsManager"/></application>';
assert.equal(history.records(unrelated, "/home/user", properties).length, 0);
