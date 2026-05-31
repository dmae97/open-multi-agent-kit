# Known limitations

- This bundle proves contract and version gates in the local workspace, not remote CI status.
- The contract gate includes build-clean, schema check, and JSON stdout checks as defined in package scripts.
- Output artifacts are sanitized by replacing local paths with [repo-root] or [home].
