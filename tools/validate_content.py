from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VALID_RARITIES = {"Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"}


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise ValueError(f"Missing file: {path.relative_to(ROOT)}")
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in {path.relative_to(ROOT)}: {exc}")


def main() -> int:
    errors: list[str] = []
    try:
        manifest = load_json(ROOT / "manifest.json")
    except ValueError as exc:
        print(f"ERROR: {exc}")
        return 1

    set_ids: set[str] = set()
    curio_ids: set[str] = set()

    for entry in manifest.get("sets", []):
        set_id = entry.get("id", "")
        if not set_id or set_id in set_ids:
            errors.append(f"Invalid or duplicate set id: {set_id!r}")
            continue
        set_ids.add(set_id)

        manifest_path = ROOT / entry.get("manifest", "")
        try:
            set_data = load_json(manifest_path)
        except ValueError as exc:
            errors.append(str(exc))
            continue

        if set_data.get("id") != set_id:
            errors.append(f"Set id mismatch for {manifest_path.relative_to(ROOT)}")

        base = manifest_path.parent
        icon = base / set_data.get("icon", "")
        curios_path = base / set_data.get("curios", "")
        if not icon.is_file():
            errors.append(f"Missing icon: {icon.relative_to(ROOT)}")

        try:
            curios_data = load_json(curios_path)
        except ValueError as exc:
            errors.append(str(exc))
            continue

        for curio in curios_data.get("curios", []):
            curio_id = curio.get("id", "")
            if not curio_id or curio_id in curio_ids:
                errors.append(f"Invalid or duplicate Curio id: {curio_id!r}")
            curio_ids.add(curio_id)
            rarity = curio.get("rarity")
            if rarity not in VALID_RARITIES:
                errors.append(f"Invalid rarity for {curio_id}: {rarity!r}")
            image = base / curio.get("image", "")
            if not image.is_file():
                errors.append(f"Missing image for {curio_id}: {image.relative_to(ROOT)}")

    if errors:
        print("Content validation failed:\n")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"Content is valid: {len(set_ids)} sets, {len(curio_ids)} Curios")
    return 0


if __name__ == "__main__":
    sys.exit(main())
