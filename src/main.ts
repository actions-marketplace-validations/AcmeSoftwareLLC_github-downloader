import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getInput, getMultilineInput, setFailed, summary } from "@actions/core";
import { getOctokit } from "@actions/github";
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
	await mkdir(outputDir, { recursive: true });

	async function downloadSingleFile(mapping: FileMapping): Promise<string> {
		const [source, destination] = mapping;
		const outputPath = join(outputDir, destination);

		try {
			const { data, status } = await octokit.rest.repos.getContent({
				owner: owner,
				repo: repo,
				path: source,
				ref: ref,
				mediaType: { format: "raw" },
			});
			if (status !== 200 || typeof data !== "string") {
				throw new Error(`Failed to download ${source} (status ${status})`);
			}

			await writeFile(outputPath, data);
			await logFileDownload(source, outputPath);
		} catch (error) {
			if (error instanceof RequestError) {
				// handle Octokit error
				console.error(
					`[Octokit Error] ${error.message} (status: ${error.status})`,
				);
			} else if (error instanceof Error) {
				// handle other errors
				console.error(`[Unexpected Error] ${error}`);
				throw error;
			} else {
				// handle non-Error objects
				console.error(`[Unknown Error]`, error);
				throw error;
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
		.addBreak()
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
