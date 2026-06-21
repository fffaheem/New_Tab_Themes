from pathlib import Path
import sys
import pathspec

if len(sys.argv) != 3:
    print("Usage: python script.py <input_folder> <output_file>")
    sys.exit(1)

ROOT = Path(sys.argv[1]).resolve()
OUTPUT = Path(sys.argv[2])

# --------------------------------------------------
# Load .gitignore rules
# --------------------------------------------------

gitignore = ROOT / ".gitignore"

if gitignore.exists():
    spec = pathspec.PathSpec.from_lines(
        "gitwildmatch",
        gitignore.read_text(encoding="utf-8").splitlines()
    )
else:
    spec = pathspec.PathSpec.from_lines("gitwildmatch", [])


def is_excluded(path: Path):
    """
    Exclude:
    - hidden files/folders (.git, .obsidian, etc.)
    - .gitignore itself
    - anything matched by .gitignore
    """

    rel = path.relative_to(ROOT).as_posix()

    if rel == ".gitignore":
        return True

    if any(part.startswith(".") for part in path.parts):
        return True

    return spec.match_file(rel)


def build_tree(path: Path, prefix=""):
    entries = sorted(
        [p for p in path.iterdir() if not is_excluded(p)],
        key=lambda p: (p.is_file(), p.name.lower())
    )

    lines = []

    for i, entry in enumerate(entries):
        is_last = i == len(entries) - 1

        connector = "└── " if is_last else "├── "

        if entry.is_dir():
            lines.append(f"{prefix}{connector}{entry.name}/")

            extension = "    " if is_last else "│   "
            lines.extend(build_tree(entry, prefix + extension))
        else:
            lines.append(f"{prefix}{connector}{entry.name}")

    return lines


with open(OUTPUT, "w", encoding="utf-8") as out:

    out.write(f"{ROOT.name}/\n")

    for line in build_tree(ROOT):
        out.write(line + "\n")

    files = sorted(
        (
            p for p in ROOT.rglob("*")
            if p.is_file() and not is_excluded(p)
        ),
        key=lambda p: str(p.relative_to(ROOT)).lower()
    )

    for file in files:
        rel_path = file.relative_to(ROOT)

        out.write("\n\n")
        out.write("=" * 120)
        out.write("\n")
        out.write(f"# FILE: {rel_path}\n")
        out.write("⬇" * 20)
        out.write("\n\n")
        out.write("=" * 120)
        out.write("\n\n")

        try:
            out.write(file.read_text(encoding="utf-8"))
        except Exception as e:
            out.write(f"[ERROR READING FILE: {e}]")

print(f"Export written to {OUTPUT}")