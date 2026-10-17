"""Re-download the original images and PDFs listed in assets/source/manifest.json.

The originals are about 300 MB, so they stay out of git. Run from the repo root:
    python3 scripts/fetch-sources.py
"""
import concurrent.futures as cf
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "source"


def fetch(entry):
    dest = SOURCE / entry["file"]
    if dest.exists() and dest.stat().st_size == entry["bytes"]:
        return entry["file"], "kept"
    dest.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        ["curl", "-sSL", "--max-time", "120", "-o", str(dest), "-w", "%{http_code}", entry["source_url"]],
        capture_output=True, text=True,
    )
    return entry["file"], result.stdout.strip() or result.stderr.strip()


def main():
    manifest = json.loads((SOURCE / "manifest.json").read_text())
    with cf.ThreadPoolExecutor(8) as pool:
        for name, status in pool.map(fetch, manifest):
            print(f"{status:>5}  {name}")


if __name__ == "__main__":
    main()
