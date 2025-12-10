import { mkdir, readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getInput, getMultilineInput, setFailed, summary } from "@actions/core";
import { createWriteStream } from "node:fs";
import { get } from "node:https";

//#region src/utils.ts
async function download(url, options, outputPath) {
	return new Promise((resolve, reject) => {
		const fileStream = createWriteStream(outputPath);
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
async function logFileDownload(input, outputPath) {
	const { size } = await stat(outputPath);
	const sizeStr = size < 1024 ? `${size} bytes` : `${(size / 1024).toFixed(2)} KB`;
	console.log(`\n📥 File Downloaded!\n   • Source:      \x1b[36m${input}\x1b[0m\n   • Saved as:    \x1b[32m${outputPath}\x1b[0m\n   • Size:        \x1b[33m${sizeStr}\x1b[0m\n----------------------------------------`);
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
		const mappings = await parseMappings(getMultilineInput("mappings"));
		const downloadedFiles = await downloadMappedFiles(mappings, {
			repo,
			ref,
			options,
			outputDir
		});
		const allFiles = outputDir ? await getFiles(outputDir) : downloadedFiles;
		await summary.addHeading("📦 GitHub Downloader Action Summary").addBreak().addRaw(`**Repository:** ${repo}`).addBreak().addRaw(`**Branch:** ${ref}`).addSeparator().addHeading("Downloaded Files", 2).addTable([[{
			data: "Source Path",
			header: true
		}, {
			data: "Saved As",
			header: true
		}], ...mappings.map(([src, _], i) => [src, downloadedFiles[i]])]).addSeparator().addHeading("Output Directory Files", 2).addBreak().addRaw(outputDir ? allFiles.length ? allFiles.map((f) => `- ${f}`).join("\n\n") : "_No files found in output directory._" : "_No output directory specified._").write();
	} catch (error) {
		setFailed(error instanceof Error ? error.message : String(error));
	}
}
async function downloadMappedFiles(mappings, { repo, ref, options, outputDir }) {
	async function downloadSingleFile(mapping) {
		const [source, destination] = mapping;
		const outputPath = outputDir ? join(outputDir, destination) : destination;
		const url = `https://raw.githubusercontent.com/${repo}/${ref}/${source}`;
		await mkdir(dirname(outputPath), { recursive: true });
		await download(url, options, outputPath);
		await logFileDownload(source, outputPath);
		return outputPath;
	}
	return Promise.all(mappings.map(downloadSingleFile));
}

//#endregion
//#region src/index.ts
run();

//#endregion
export {  };
//# sourceMappingURL=index.mjs.map