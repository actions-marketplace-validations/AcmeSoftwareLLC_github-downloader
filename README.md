# Github Downloader Action

This action downloads the file from provided Github repository.

## Usage

```yaml
steps:
  - name: Prepare the resources for signing
    uses: AcmeSoftwareLLC/github-downloader@v1
    with:
      git-pat: ${{ secrets.GIT_PAT }}
      repo: org/repo
      ref: main
```