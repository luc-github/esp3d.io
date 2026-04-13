#!/usr/bin/env python3
"""
ftp_transfer.py (corrected)
Upload les fichiers listés dans files_to_transfer.txt vers un serveur FTP.
Corrige les problèmes de chemin (/www/www/www) et affiche les fichiers en cours.
"""

import argparse
import os
from pathlib import Path
from ftplib import FTP, error_perm
import time

try:
    from tqdm import tqdm
except Exception:
    tqdm = None


def ensure_remote_dirs(ftp: FTP, remote_dir: str):
    """
    Crée récursivement les répertoires distants s'ils n'existent pas.
    Corrigé pour fonctionner avec des chemins absolus (/www/...) sans duplication.
    """
    remote_dir = remote_dir.strip("/")
    if not remote_dir:
        return
    parts = remote_dir.split("/")
    ftp.cwd("/")  # toujours partir de la racine
    for part in parts:
        if not part:
            continue
        try:
            ftp.cwd(part)
        except error_perm:
            ftp.mkd(part)
            ftp.cwd(part)
    ftp.cwd("/")  # revenir à la racine après création


def upload_file(ftp: FTP, local_path: Path, remote_path: str, verbose=True):
    """
    Envoie un fichier local vers le chemin distant sur le serveur FTP.
    """
    dirname = os.path.dirname(remote_path).strip("/")
    basename = os.path.basename(remote_path)
    if verbose:
        print(f"\n➡️  Uploading: {local_path}")
        print(f"   ↳ Remote path: /{remote_path}")

    ftp.cwd("/")
    if dirname:
        ensure_remote_dirs(ftp, dirname)
        ftp.cwd(dirname)

    with open(local_path, "rb") as fh:
        ftp.storbinary(f"STOR {basename}", fh)

    ftp.cwd("/")  # sécurité
    if verbose:
        print(f"✅ Uploaded: {basename} → /{remote_path}")


def parse_files_to_transfer(path: Path):
    """
    Lit le fichier de liste (added/modified) et renvoie la liste des fichiers à transférer.
    """
    entries = []
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            if "\t" in line:
                kind, rel = line.split("\t", 1)
            else:
                rel = line
                kind = "unknown"
            entries.append((kind, rel))
    return entries


def main():
    p = argparse.ArgumentParser(description="Upload differential files to FTP (corrected)")
    p.add_argument("--ftp-host", required=True)
    p.add_argument("--ftp-user", required=True)
    p.add_argument("--ftp-pass", required=True)
    p.add_argument("--local-root", "-r", required=True, help="Local root folder corresponding to reference root")
    p.add_argument("--files", required=True, help="Files to transfer list (created by hash_compare)")
    p.add_argument("--new-ref", required=True, help="New reference JSON (produced by hash_compare)")
    p.add_argument("--remote-base", default="", help="Remote base path on FTP (prefix to all uploaded paths, e.g. /www)")
    p.add_argument("--upload-ref", action="store_true", help="Upload the new reference JSON to the FTP as well")
    p.add_argument("--delete-remote-removed", action="store_true", help="Delete remote files that were removed locally")
    args = p.parse_args()

    local_root = Path(args.local_root).resolve()
    if not local_root.is_dir():
        raise SystemExit(f"{local_root} is not a directory")
    files_list = Path(args.files)
    if not files_list.is_file():
        raise SystemExit(f"{files_list} not found")
    new_ref = Path(args.new_ref)
    if not new_ref.is_file():
        raise SystemExit(f"{new_ref} not found")

    to_transfer = parse_files_to_transfer(files_list)
    if not to_transfer:
        print("No files to transfer.")
        if args.upload_ref:
            ftp = FTP(args.ftp_host, args.ftp_user, args.ftp_pass)
            remote_ref_path = "/".join(filter(None, [args.remote_base.strip("/"), new_ref.name]))
            upload_file(ftp, new_ref, remote_ref_path)
            ftp.quit()
            print("Uploaded reference to FTP.")
        return

    ftp = FTP(args.ftp_host)
    ftp.login(args.ftp_user, args.ftp_pass)
    print(f"✅ Connected to {args.ftp_host} as {args.ftp_user}")

    iterator = tqdm(to_transfer, desc="Uploading") if tqdm else to_transfer

    for kind, rel in iterator:
        local_path = local_root.joinpath(rel)
        if not local_path.is_file():
            print(f"⚠️ Skipping (not found): {rel}")
            continue

        # Construction correcte du chemin distant
        rel_posix = rel.replace(os.sep, "/").lstrip("/")
        remote_path = "/".join(filter(None, [args.remote_base.strip("/"), rel_posix]))

        try:
            upload_file(ftp, local_path, remote_path, verbose=True)
        except Exception as e:
            print(f"❌ Failed to upload {rel}: {e}")

    # Suppression des fichiers supprimés si demandé
    if args.delete_remote_removed:
        removed_file = files_list.with_name(files_list.stem.replace("files_to_transfer", "removed_files") + files_list.suffix)
        if removed_file.is_file():
            with open(removed_file, "r", encoding="utf-8") as fh:
                for line in fh:
                    path = line.strip()
                    if not path:
                        continue
                    remote_path = "/".join(filter(None, [args.remote_base.strip("/"), path.replace(os.sep, "/")]))
                    dirname = os.path.dirname(remote_path)
                    basename = os.path.basename(remote_path)
                    try:
                        ftp.cwd("/")
                        ensure_remote_dirs(ftp, dirname)
                        ftp.cwd(dirname)
                        ftp.delete(basename)
                        print(f"🗑️ Deleted remote file: /{remote_path}")
                    except Exception as e:
                        print(f"⚠️ Could not delete remote {remote_path}: {e}")

    # Upload du nouveau hash de référence
    if args.upload_ref:
        remote_ref_path = "/".join(filter(None, [args.remote_base.strip("/"), new_ref.name]))
        try:
            upload_file(ftp, new_ref, remote_ref_path)
            print(f"✅ Uploaded new reference to /{remote_ref_path}")
        except Exception as e:
            print(f"❌ Failed to upload reference: {e}")

    ftp.quit()
    print("\n🎉 Upload done. If everything is OK you can replace your old hash_reference.json with the new one:")
    print(f" -> {new_ref}")


if __name__ == "__main__":
    main()
