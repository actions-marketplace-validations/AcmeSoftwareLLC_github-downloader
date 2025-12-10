# 📥 GitHub Downloader Action

Easily download files from any public or private GitHub repository in your GitHub Actions workflows! 🚀

---

## ✨ Features

- 🔒 Supports private repositories via Personal Access Token (PAT) or GITHUB_TOKEN
- 📂 Download multiple files or folders in one step
- 🏷️ Specify branch, tag, or commit SHA for precise control
- 🗂️ Map source files to custom destination paths using JSON
- 📝 Generates a workflow summary table for all downloaded files
- 🛠️ Simple setup and configuration
- 🧩 Integrates seamlessly with other actions
- 🖼️ Visual summary in workflow logs

---

## 📦 Quick Start

Add the action to your workflow YAML:

```yaml
jobs:
	download-files:
		runs-on: ubuntu-latest
		steps:
			- name: Checkout
				uses: actions/checkout@v4
			- name: Download files from repo
				uses: AcmeSoftwareLLC/github-downloader@v2
				with:
					token: ${{ secrets.GITHUB_TOKEN }}
					owner: AcmeSoftwareLLC
					repo: example-repo
					ref: develop
					mappings: |
						{
							"src/config.json": "config/config.json",
							"docs/manual.pdf": "documentation/manual.pdf"
						}
					output-directory: "downloads"
```

---

## ⚙️ Input Parameters

| Name              | Required | Description                                                      |
|-------------------|----------|------------------------------------------------------------------|
| `token`           | ✅       | GitHub Personal Access Token or GITHUB_TOKEN                      |
| `owner`           | ✅       | GitHub repository owner (e.g., `octocat`)                         |
| `repo`            | ✅       | Repository name (e.g., `Hello-World`)                             |
| `ref`             | ❌       | Branch, tag, or commit SHA (default: `main`)                      |
| `mappings`        | ✅       | JSON object mapping source files to destination paths              |
| `output-directory`| ❌       | Directory to save files (default: current directory)               |

**Example mappings:**

```json
{
	"README.md": "docs/README.md",
	"src/utils.ts": "lib/utils.ts",
}
```

---

## 📤 Output Parameters

| Name    | Description                                                      |
|---------|------------------------------------------------------------------|
| `files` | JSON array of all downloaded file paths (for use in later steps) |

---

## 🐞 Troubleshooting

- Ensure your PAT or GITHUB_TOKEN has access to the target repository (repo/read permissions).
- Check that your mappings JSON is valid and paths exist in the source repo.
- Review workflow logs for error messages and summary table.
- If files are missing, verify the branch/tag/commit and file paths.

---

## ❓ FAQ

**Q: Can I download from private repositories?**
A: Yes! Use a PAT or GITHUB_TOKEN with access to the target repo.

**Q: Can I download folders?**
A: No, only individual files are supported.

**Q: What happens if a file doesn't exist?**
A: The action will fail and report the missing file in the summary.

**Q: Can I use this in composite actions?**
A: Yes, it works in any workflow step.

---

## 🤝 Contributing

Pull requests and issues are welcome! Please review the [LICENSE](./LICENSE) before contributing.

---

## 📚 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Creating a Personal Access Token](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token)

---

## 📝 License

MIT © AcmeSoftwareLLC
