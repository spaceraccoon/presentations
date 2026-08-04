#!/usr/bin/env python3
"""
clean_metadata.py

Recursively cleans metadata (Info dictionary, XMP streams, PieceInfo) from PDF files.

Usage:
    python3 clean_metadata.py [path_or_file ...]

Options:
    -h, --help       Show this help message
    --check          Inspect and display metadata without modifying files

Requirements:
    pip install pypdf
"""

import sys
import os
import glob
from pypdf import PdfReader, PdfWriter


def clean_pdf_metadata(filepath: str, check_only: bool = False) -> bool:
    """
    Strips document info dictionary and XMP metadata stream from a PDF file.
    Returns True if file was clean (or cleaned), False if an error occurred.
    """
    try:
        reader = PdfReader(filepath)
        info = reader.metadata or {}
        has_xmp = '/Metadata' in reader.trailer['/Root']
        has_info = bool(info)

        if check_only:
            status = "CLEAN" if (not has_info and not has_xmp) else "HAS METADATA"
            print(f"[{status}] {filepath}")
            if has_info:
                print(f"  Info: {dict(info)}")
            if has_xmp:
                print(f"  XMP Metadata Stream: Present")
            return True

        if not has_info and not has_xmp:
            print(f"[ALREADY CLEAN] {filepath}")
            return True

        print(f"[CLEANING] {filepath}...")
        writer = PdfWriter()

        for page in reader.pages:
            if '/Metadata' in page:
                del page['/Metadata']
            if '/PieceInfo' in page:
                del page['/PieceInfo']
            writer.add_page(page)

        if '/Metadata' in writer._root_object:
            del writer._root_object['/Metadata']
        if '/PieceInfo' in writer._root_object:
            del writer._root_object['/PieceInfo']

        if writer._info:
            info_obj = writer._info.get_object()
            info_obj.clear()

        tmp_path = filepath + ".tmp"
        with open(tmp_path, "wb") as out_f:
            writer.write(out_f)

        os.replace(tmp_path, filepath)
        print(f"[CLEANED] {filepath}")
        return True

    except Exception as e:
        print(f"[ERROR] Failed to process {filepath}: {e}", file=sys.stderr)
        return False


def main():
    check_only = "--check" in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith("--")]

    if "-h" in sys.argv or "--help" in sys.argv:
        print(__doc__.strip())
        sys.exit(0)

    target_paths = args if args else ["."]
    pdf_files = []

    for path in target_paths:
        if os.path.isfile(path) and path.lower().endswith(".pdf"):
            pdf_files.append(path)
        elif os.path.isdir(path):
            pdf_files.extend(glob.glob(os.path.join(path, "**", "*.pdf"), recursive=True))

    pdf_files = sorted(set(pdf_files))

    if not pdf_files:
        print("No PDF files found.")
        sys.exit(0)

    print(f"Found {len(pdf_files)} PDF file(s).")
    success_count = 0
    for pdf in pdf_files:
        if clean_pdf_metadata(pdf, check_only=check_only):
            success_count += 1

    print(f"\nFinished. Processed {success_count}/{len(pdf_files)} files successfully.")


if __name__ == "__main__":
    main()
