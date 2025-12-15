import { createWriteStream, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import {
	getInput,
	getMultilineInput,
	setFailed,
	setOutput,
	summary,
} from "@actions/core";
import { getOctokit } from "@actions/github";
import { mkdirP } from "@actions/io";
import { RequestError } from "@octokit/request-error";
import {
	type FileMapping,
	getFiles,
	logFileDownload,
	parseMappings,
} from "./utils.js";

export async function run(): Promise<void> {
	try {
		const owner = getInput("owner", { required: true });
		const repo = getInput("repo", { required: true });
		const ref = getInput("ref") || "main";
		const token = getInput("token", { required: true });
		const outputDir = getInput("output-directory") || ".";

		const mappings = await parseMappings(getMultilineInput("mappings"));
		const props = { owner, repo, ref, token, outputDir };

		const downloadedFiles = await downloadMappedFiles(mappings, props);
		const allFiles = await getFiles(outputDir);

		await writeSummary({
			downloadedFiles: mappings.map((mapping, index) => [
				mapping[0],
				downloadedFiles[index],
			]),
			repo: `${owner}/${repo}`,
			ref,
			allFiles,
		});

		setOutput("files", downloadedFiles);
	} catch (error) {
		setFailed(error instanceof Error ? error.message : String(error));
	}
}

interface DownloadProps {
	owner: string;
	repo: string;
	ref: string;
	token: string;
	outputDir: string;
}

async function downloadMappedFiles(
	mappings: FileMapping[],
	{ owner, repo, ref, token, outputDir }: DownloadProps,
): Promise<string[]> {
	const octokit = getOctokit(token);

	async function downloadSingleFile(mapping: FileMapping): Promise<string> {
		const [source, destination] = mapping;
		const outputPath = join(outputDir, destination);
		const dirPath = dirname(outputPath);

		try {
			const { data, status } = await octokit.rest.repos.getContent({
				owner: owner,
				repo: repo,
				path: source,
				ref: ref,
				mediaType: { format: "raw" },
				request: {
					parseSuccessResponseBody: false,
				},
			});
			if (status !== 200) {
				throw new Error(`Failed to download ${source} (status ${status})`);
			}

			if (dirPath && !existsSync(dirPath)) {
				console.log(`Creating directory: ${dirPath}`);
				await mkdirP(dirPath);
			}

			const stream = data as unknown as ReadableStream;
			await pipeline(stream, createWriteStream(outputPath));
			await logFileDownload(source, outputPath);
		} catch (error) {
			if (
				error instanceof RequestError ||
				error?.constructor?.name === "RequestError"
			) {
				const err = error as RequestError;
				if (err.status === 401) {
					setFailed(
						`Unauthorized access when trying to download ${source}. ` +
							`Please check if the provided token has contents access permissions.`,
					);
				} else if (err.status === 404) {
					setFailed(
						`File not found: ${source}. ` +
							`Please check if there is a file at https://github.com/${owner}/${repo}/blob/${ref}/${source}`,
					);
				} else {
					setFailed(
						`Failed to download ${source}: ${err.message} (status: ${err.status})`,
					);
				}
			} else {
				setFailed(
					`An unexpected error occurred while downloading ${source}: ${
						error instanceof Error ? error.message : String(error)
					}`,
				);
			}
		}
		return outputPath;
	}

	return Promise.all(mappings.map(downloadSingleFile));
}

interface SummaryData {
	allFiles: string[];
	downloadedFiles: FileMapping[];
	ref: string;
	repo: string;
}

async function writeSummary({
	allFiles,
	downloadedFiles,
	ref,
	repo,
}: SummaryData): Promise<void> {
	let summaryWriter = summary
		.addHeading("📦 GitHub Downloader Action Summary")
		.addBreak()
		.addTable([
			[{ data: "Repository" }, { data: repo }],
			[{ data: "Branch" }, { data: ref }],
		])
		.addHeading("Downloaded Files", 2)
		.addTable([
			[
				{ data: "Source Path", header: true },
				{ data: "Saved As", header: true },
			],
			...downloadedFiles,
		])
		.addSeparator()
		.addHeading("Output Directory Files", 2);

	if (allFiles) {
		for (const file of allFiles) {
			summaryWriter = summaryWriter.addRaw(`\n- ${file}`);
		}
	} else {
		summaryWriter = summaryWriter.addRaw(
			"/n_No files found in output directory._",
		);
	}

	await summaryWriter.addBreak().write();
}
