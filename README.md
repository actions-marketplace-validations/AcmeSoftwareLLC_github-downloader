# Github Downloader Action

This action downloads the file from provided Github repository.

## Usage

```yaml
steps:
  - name: Prepare the resources for signing Android app
    uses: AcmeSoftwareLLC/github-downloader@v1
    with:
      git-pat: ${{ secrets.GIT_PAT }}
      repo: org/reponame
      ref: main
      mappings: |
        {
          "android/acme.jks": "key.jks",
          "android/key.properties": "key.properties"
        }
      output-directory: android
```