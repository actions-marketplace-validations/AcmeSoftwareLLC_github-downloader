import { mkdir, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getInput, getMultilineInput, setFailed, summary } from "@actions/core";
import { createWriteStream } from "node:fs";
import { get } from "node:https";

//#region src/utils.ts
async function download(url, options, output) {
	return new Promise((resolve, reject) => {
		const fileStream = createWriteStream(output);
		fileStream.on("error", reject);
		const req = get(url, options, (res) => {
			if (res.statusCode && res.statusCode >= 400) {
				res.resume();
				return reject(/* @__PURE__ */ new Error(`Failed to download ${url} (status ${res.statusCode})`));
			}
			res.pipe(fileStream);
			fileStream.on("finish", () => {
				fileStream.close((err) => {
					if (err) return reject(err);
					resolve();
				});
			});
		});
		req.on("error", reject);
		req.setTimeout(15e3, () => {
			req.destroy(/* @__PURE__ */ new Error(`Request timed out for ${url}`));
		});
	});
}
async function getFiles(directory) {
	return (await readdir(directory, {
		recursive: true,
		withFileTypes: true
	})).filter((dirent) => dirent.isFile()).map((dirent) => join(directory, dirent.name));
}
async function parseMappings(mappings) {
	const mappingStr = mappings.join("");
	return Object.entries(JSON.parse(mappingStr));
}

//#endregion
//#region src/main.ts
async function run() {
	try {
		const repo = getInput("repo", { required: true });
		const ref = getInput("ref") || "main";
		const pat = getInput("git-pat");
		const outputDir = getInput("output-directory");
		const options = pat ? { headers: { Authorization: `token ${pat}` } } : {};
		const downloadedFiles = await downloadMappedFiles(await parseMappings(getMultilineInput("mappings")), {
			repo,
			ref,
			options,
			outputDir
		});
		const allFiles = outputDir ? await getFiles(outputDir) : downloadedFiles;
		await summary.addHeading("Download Summary").addTable([
			[{
				data: "Description",
				header: true
			}, {
				data: "Result",
				header: true
			}],
			["Repo", repo],
			["Ref", ref],
			["Downloaded Files", downloadedFiles.join("\n")],
			...outputDir ? [["All Files in Output", allFiles.join("\n")]] : []
		]).write();
	} catch (error) {
		setFailed(error instanceof Error ? error.message : String(error));
	}
}
async function downloadMappedFiles(mappings, { repo, ref, options, outputDir }) {
	async function downloadSingleFile(mapping) {
		const [input, output] = mapping;
		const outputLocation = outputDir ? join(outputDir, output) : output;
		const url = `https://raw.githubusercontent.com/${repo}/${ref}/${input}`;
		await mkdir(dirname(outputLocation), { recursive: true });
		await download(url, options, outputLocation);
		console.log(`✅ Downloaded "${input}" → "${outputLocation}"`);
		return outputLocation;
	}
	return Promise.all(mappings.map(downloadSingleFile));
}

//#endregion
//#region src/index.ts
run();

//#endregion
export {  };
//# sourceMappingURL=index.mjs.map