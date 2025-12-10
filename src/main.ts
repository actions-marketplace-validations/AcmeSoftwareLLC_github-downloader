import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getInput, getMultilineInput, setFailed, summary } from "@actions/core";
import {
	download,
	type FileMapping,
	getFiles,
	logFileDownload,
	parseMappings,
} from "./utils.js";

export async function run(): Promise<void> {
	try {
		const repo = getInput("repo", { required: true });
		const ref = getInput("ref") || "main";
		const pat = getInput("git-pat");
		const outputDir = getInput("output-directory");

		const headers = new Headers();
		if (pat) {
			headers.append("Authorization", `token ${pat}`);
		}

		const mappings = await parseMappings(getMultilineInput("mappings"));
		const props = { repo, ref, headers, outputDir };

		const downloadedFiles = await downloadMappedFiles(mappings, props);
		const allFiles = await getFiles(outputDir);

		await writeSummary({
			downloadedFiles: mappings.map((mapping, index) => [
				mapping[0],
				downloadedFiles[index],
			]),
			repo,
			ref,
			allFiles,
		});
	} catch (error) {
		setFailed(error instanceof Error ? error.message : String(error));
	}
}

interface DownloadProps {
	repo: string;
	ref: string;
	headers: Headers;
	outputDir: string;
}

async function downloadMappedFiles(
	mappings: FileMapping[],
	{ repo, ref, headers, outputDir }: DownloadProps,
): Promise<string[]> {
	async function downloadSingleFile(mapping: FileMapping): Promise<string> {
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
