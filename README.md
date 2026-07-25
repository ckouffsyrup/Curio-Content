# Curio Content

Official downloadable content for the Curio game. This repository contains data and images only; game code belongs in the main Curio repository.

## Public content URL

After GitHub Pages is enabled, Curio should read:

```text
https://YOUR_GITHUB_USERNAME.github.io/Curio-Content/manifest.json
```

For the planned account name, this will likely be:

```text
https://ckouffsyrup.github.io/Curio-Content/manifest.json
```

## Repository structure

```text
manifest.json
sets/
  set_id/
    set.json
    curios.json
    icon.png
    images/
      curio_id.png
```

## Adding a new set

1. Copy `sets/example_set` and rename the folder using a permanent lowercase ID, such as `doki`.
2. Edit `set.json` and `curios.json`.
3. Add `icon.png` and all Curio images.
4. Add the set to the root `manifest.json`.
5. Increase `content_version` in `manifest.json`.
6. Run `python tools/validate_content.py`.
7. Commit and push the changes.

## Updating an existing set

Increase both:

- The set's `version` in `sets/<set_id>/set.json`
- The root `content_version` in `manifest.json`

Curio can then download only that changed set.

## Important rules

- Never rename a released set ID or Curio ID.
- Never reuse an old ID for different content.
- Keep custom/player-created content separate from this repository.
- Add files first and enable the set last.
- Test the manifest URL after every push.
