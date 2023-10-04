import { getInput, setFailed, summary } from "@actions/core";

try {
  const pat = getInput("git-pat");
  const repo = getInput("repo");
  const ref = getInput("ref");
  const includes = getInput("includes");

  console.log(`pat: ${pat}`);
  console.log(`repo: ${repo}`);
  console.log(`ref: ${ref}`);
  console.log(`includes: ${includes}`);

  summary
    .addHeading("Summary")
    .addTable([
      [
        { data: "Description", header: true },
        { data: "Result", header: true },
      ],
      ["Repo", repo],
    ])
    .write();
} catch (error) {
  setFailed(error.message);
}
