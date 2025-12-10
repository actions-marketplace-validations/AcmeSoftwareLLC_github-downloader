import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getInput, getMultilineInput, setFailed, summary } from "@actions/core";
import { getOctokit } from "@actions/github";

//#region node_modules/@octokit/request-error/dist-src/index.js
var RequestError = class extends Error {
	name;
	/**
	* http status code
	*/
	status;
	/**
	* Request options that lead to the error.
	*/
	request;
	/**
	* Response object if a response was received
	*/
	response;
	constructor(message, statusCode, options) {
		super(message, { cause: options.cause });
		this.name = "HttpError";
		this.status = Number.parseInt(statusCode);
		if (Number.isNaN(this.status)) this.status = 0;
		/* v8 ignore else -- @preserve -- Bug with vitest coverage where it sees an else branch that doesn't exist */
		if ("response" in options) this.response = options.response;
		const requestCopy = Object.assign({}, options.request);
		if (options.request.headers.authorization) requestCopy.headers = Object.assign({}, options.request.headers, { authorization: options.request.headers.authorization.replace(/(?<! ) .*$/, " [REDACTED]") });
		requestCopy.url = requestCopy.url.replace(/\bclient_secret=\w+/g, "client_secret=[REDACTED]").replace(/\baccess_token=\w+/g, "access_token=[REDACTED]");
		this.request = requestCopy;
	}
};

//#endregion
//#region src/utils.ts
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
		const owner = getInput("owner", { required: true });
		const repo = getInput("repo", { required: true });
		const ref = getInput("ref") || "main";
		const token = getInput("token", { required: true });
		const outputDir = getInput("output-directory") || ".";
		const mappings = await parseMappings(getMultilineInput("mappings"));
		const downloadedFiles = await downloadMappedFiles(mappings, {
			owner,
			repo,
			ref,
			token,
			outputDir
		});
		const allFiles = await getFiles(outputDir);
		await writeSummary({
			downloadedFiles: mappings.map((mapping, index) => [mapping[0], downloadedFiles[index]]),
			repo: `${owner}/${repo}`,
			ref,
			allFiles
		});
	} catch (error) {
		setFailed(error instanceof Error ? error.message : String(error));
	}
}
async function downloadMappedFiles(mappings, { owner, repo, ref, token, outputDir }) {
	const octokit = getOctokit(token);
	await mkdir(outputDir, { recursive: true });
	async function downloadSingleFile(mapping) {
		const [source, destination] = mapping;
		const outputPath = join(outputDir, destination);
		try {
			const { data, status } = await octokit.rest.repos.getContent({
				owner,
				repo,
				path: source,
				ref,
				mediaType: { format: "raw" }
			});
			if (status !== 200 || typeof data !== "string") throw new Error(`Failed to download ${source} (status ${status})`);
			await writeFile(outputPath, data);
			await logFileDownload(source, outputPath);
		} catch (error) {
			if (error instanceof RequestError || error?.constructor?.name === "RequestError") {
				const err = error;
				if (err.status === 401) setFailed(`Unauthorized access when trying to download ${source}. Please check if the provided token has contents access permissions.`);
				else if (err.status === 404) setFailed(`File not found: ${source}. Please check if there is a file at https://github.com/${owner}/${repo}/blob/${ref}/${source}`);
				else setFailed(`Failed to download ${source}: ${err.message} (status: ${err.status})`);
			} else setFailed(`An unexpected error occurred while downloading ${source}: ${error instanceof Error ? error.message : String(error)}`);
		}
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