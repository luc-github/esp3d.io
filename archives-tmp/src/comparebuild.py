#!/usr/bin/env python3
"""
hash_compare.py
Compare l'arborescence actuelle avec hash_reference.json et produit :
 - files_to_transfer.txt  (added + modified)
 - removed_files.txt      (deleted since reference)
 - new_hash_reference.json (nouvelle référence après build)
Usage:
  python hash_compare.py --root site/ --ref hash_reference.json --out-prefix build_diff
"""
import argparse
import os
import json
import hashlib
import binascii
from pathlib import Path

try:
    from tqdm import tqdm
except Exception:
    tqdm = None

def hash_file_sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()

def hash_file_crc32(path):
    crc = 0
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            crc = binascii.crc32(chunk, crc)
    return format(crc & 0xFFFFFFFF, "08x")

def main():
    p = argparse.ArgumentParser(description="Compare current build with reference hashes")
    p.add_argument("--root", "-r", required=True, help="Root folder to scan")
    p.add_argument("--ref", required=True, help="Reference JSON file (hash_reference.json)")
    p.add_argument("--out-prefix", default="build_diff", help="Prefix for output files")
    args = p.parse_args()

    root = Path(args.root).resolve()
    ref_path = Path(args.ref)
    if not root.is_dir():
        raise SystemExit(f"{root} is not a directory")
    if not ref_path.is_file():
        raise SystemExit(f"{ref_path} not found")

    ref = json.loads(ref_path.read_text(encoding="utf-8"))
    algo = ref.get("algo", "sha256")
    ref_hashes = ref.get("hashes", {})

    files = [p for p in root.rglob("*") if p.is_file()]
    print(f"Scanning {len(files)} files using {algo}...")

    new_hashes = {}
    iterator = tqdm(files, desc="Hashing") if tqdm else files
    for f in iterator:
        rel = str(f.relative_to(root)).replace(os.sep, "/")
        if algo == "sha256":
            h = hash_file_sha256(f)
        else:
            h = hash_file_crc32(f)
        new_hashes[rel] = h

    # detect added/modified/removed
    to_transfer = []
    for path, h in new_hashes.items():
        if path not in ref_hashes:
            to_transfer.append(("added", path))
        elif ref_hashes[path] != h:
            to_transfer.append(("modified", path))

    removed = [p for p in ref_hashes.keys() if p not in new_hashes]

    # write outputs
    prefix = args.out_prefix
    files_to_transfer_path = Path(f"{prefix}_files_to_transfer.txt")
    with open(files_to_transfer_path, "w", encoding="utf-8") as fh:
        for kind, path in to_transfer:
            fh.write(f"{kind}\t{path}\n")

    removed_path = Path(f"{prefix}_removed_files.txt")
    with open(removed_path, "w", encoding="utf-8") as fh:
        for p in removed:
            fh.write(f"{p}\n")

    new_ref_path = Path(f"{prefix}_new_hash_reference.json")
    new_ref_content = {"root": str(root), "algo": algo, "hashes": new_hashes}
    with open(new_ref_path, "w", encoding="utf-8") as fh:
        json.dump(new_ref_content, fh, indent=2, ensure_ascii=False)

    # summary
    print(f"Added or modified: {len(to_transfer)} (written to {files_to_transfer_path})")
    print(f"Removed: {len(removed)} (written to {removed_path})")
    print(f"New reference saved to {new_ref_path}")

if __name__ == "__main__":
    main()
