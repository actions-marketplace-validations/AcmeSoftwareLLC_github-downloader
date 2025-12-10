import { mkdir, readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getInput, getMultilineInput, setFailed, summary } from "@actions/core";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";

//#region src/utils.ts
async function download(url, headers, outputPath) {
	const res = await fetch(url, {
		method: "GET",
		headers
	});
	if (!res.ok || !res.body) throw new Error(`Failed to download ${url} (status ${res.status})`);
	const fileStream = createWriteStream(outputPath);
	await pipeline(res.body, fileStream);
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
		const headers = new Headers();
		if (pat) headers.append("Authorization", `token ${pat}`);
		const mappings = await parseMappings(getMultilineInput("mappings"));
		const downloadedFiles = await downloadMappedFiles(mappings, {
			repo,
			ref,
			headers,
			outputDir
		});
		const allFiles = await getFiles(outputDir);
		await writeSummary({
			downloadedFiles: mappings.map((mapping, index) => [mapping[0], downloadedFiles[index]]),
			repo,
			ref,
			allFiles
		});
	} catch (error) {
		setFailed(error instanceof Error ? error.message : String(error));
	}
}
async function downloadMappedFiles(mappings, { repo, ref, headers, outputDir }) {
	async function downloadSingleFile(mapping) {
		const [source, destination] = mapping;
		const outputPath = outputDir ? join(outputDir, destination) : destination;
		const url = `https://raw.githubusercontent.com/${repo}/${ref}/${source}`;
		await mkdir(dirname(outputPath), { recursive: true });
		await download(url, headers, outputPath);
		await logFileDownload(source, outputPath);
		return outputPath;
	}
	return Promise.all(mappings.map(downloadSingleFile));
}
async function writeSummary({ allFiles, downloadedFiles, ref, repo }) {
	let summaryWriter = summary.addHeading("📦 GitHub Downloader Action Summary").addBreak().addTable([[{ data: "Repository" }, { data: repo }], [{ data: "Branch" }, { data: ref }]]).addBreak().addHeading("Downloaded Files", 2).addTable([[{
		data: "Source Path",
		header: true
	}, {
		data: "Saved As",
		header: true
	}], ...downloadedFiles]).addSeparator().addHeading("Output Directory Files", 2);
	if (allFiles) for (const file of allFiles) summaryWriter = summaryWriter.addRaw(`\n- ${file}`);
	else summaryWriter = summaryWriter.addRaw("/n_No files found in output directory._");
	await summaryWriter.addBreak().write();
}

//#endregion
//#region src/index.ts
run();

//#endregion
export {  };
//# sourceMappingURL=index.mjs.map