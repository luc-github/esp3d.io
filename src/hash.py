#!/usr/bin/env python3
"""
hash_init.py
Scanne un répertoire et génère un fichier hash_reference.json contenant
les hachages (SHA256 par défaut) de tous les fichiers.
Usage: python hash_init.py --root site/ --out hash_reference.json --algo sha256
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
    # format as 8-hex (zero-padded)
    return format(crc & 0xFFFFFFFF, "08x")

def main():
    p = argparse.ArgumentParser(description="Init hash reference for a directory")
    p.add_argument("--root", "-r", required=True, help="Root folder to scan")
    p.add_argument("--out", "-o", default="hash_reference.json", help="Output JSON file")
    p.add_argument("--algo", "-a", choices=["sha256", "crc32"], default="sha256", help="Hash algorithm")
    args = p.parse_args()

    root = Path(args.root).resolve()
    if not root.is_dir():
        raise SystemExit(f"{root} is not a directory")

    files = [p for p in root.rglob("*") if p.is_file()]

    print(f"Scanning {len(files)} files in {root} using {args.algo}...")

    hashes = {}
    iterator = tqdm(files, desc="Hashing") if tqdm else files
    for f in iterator:
        rel = str(f.relative_to(root)).replace(os.sep, "/")
        if args.algo == "sha256":
            h = hash_file_sha256(f)
        else:
            h = hash_file_crc32(f)
        hashes[rel] = h

    out = Path(args.out)
    with open(out, "w", encoding="utf-8") as fh:
        json.dump({"root": str(root), "algo": args.algo, "hashes": hashes}, fh, indent=2, ensure_ascii=False)

    print(f"Reference written to {out}")

if __name__ == "__main__":
    main()
