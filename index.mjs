import { cpSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { scramjetPath } from "@mercuryworkshop/scramjet/path";

const require = createRequire(import.meta.url);
const dirOf = specifier => path.dirname(require.resolve(specifier));
const out = path.resolve(process.argv[2] ?? ".");

const targets = {
	scram: scramjetPath,
	utils: dirOf("@mercuryworkshop/scramjet-utils"),
	controller: dirOf("@mercuryworkshop/scramjet-controller"),
	libcurl: dirOf("@mercuryworkshop/libcurl-transport"),
	epoxy: dirOf("@mercuryworkshop/epoxy-transport")
};

for (const [name, src] of Object.entries(targets)) {
	const dest = path.join(out, name);
	rmSync(dest, { recursive: true, force: true });
	cpSync(src, dest, { recursive: true });
	console.log(`${name}/  <-  ${src}`);
}
