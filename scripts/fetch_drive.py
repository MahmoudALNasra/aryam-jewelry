"""Download images from a public Google Drive folder."""
import json
import re
import ssl
import urllib.request
from pathlib import Path

FOLDER_ID = "1RJ_S_KqhlMQryd0xtmk3DFeVcIc6JX_Y"
OUT = Path(__file__).resolve().parents[1] / "images" / "products"
OUT.mkdir(parents=True, exist_ok=True)

CTX = ssl.create_default_context()
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, context=CTX, timeout=60) as r:
        return r.read()


def list_files(folder_id: str):
    # Public folder page embeds file metadata; also try Drive UI endpoint.
    html = fetch(f"https://drive.google.com/drive/folders/{folder_id}?usp=sharing").decode("utf-8", "ignore")
    # Pattern: ["FILENAME.jpeg", null, null, ...] near file id "1xxxx"
    # Common embedding: ["1FILEID", ... "name.jpeg" ...]
    pairs = []
    # Match file id then nearby jpeg name (within ~400 chars)
    for m in re.finditer(r'\["(1[A-Za-z0-9_-]{10,})",\d+', html):
        fid = m.group(1)
        window = html[m.start() : m.start() + 800]
        name_m = re.search(r'([A-Fa-f0-9-]{8,}\.jpe?g)', window, re.I)
        if name_m:
            pairs.append((fid, name_m.group(1)))
    # Alternate: name first then id
    for m in re.finditer(r'([A-Fa-f0-9-]{8,}\.jpe?g)', html, re.I):
        name = m.group(1)
        window = html[max(0, m.start() - 400) : m.start() + 200]
        id_m = re.search(r'"(1[A-Za-z0-9_-]{20,})"', window)
        if id_m:
            pairs.append((id_m.group(1), name))

    # Deduplicate by name
    by_name = {}
    for fid, name in pairs:
        by_name[name.lower()] = (fid, name)

    if not by_name:
        # Dump debug snippets
        idx = html.lower().find("jpeg")
        print("DEBUG around jpeg:", html[max(0, idx - 100) : idx + 200] if idx >= 0 else "no jpeg")
        # Try API-ish open endpoint
        api = f"https://drive.google.com/drive/folders/{folder_id}?usp=sharing&resourcekey"
        print("html len", len(html), "unique 1* ids", len(set(re.findall(r'"(1[A-Za-z0-9_-]{20,})"', html))))

    return list(by_name.values())


def download_file(file_id: str, dest: Path):
    # Confirm page may be needed for large files; these are ~1MB so direct usually works.
    url = f"https://drive.google.com/uc?export=download&id={file_id}"
    data = fetch(url)
    # If HTML interstitial, try confirm token
    if data[:20].lstrip().startswith(b"<!DOCTYPE") or data[:15].lstrip().startswith(b"<html"):
        text = data.decode("utf-8", "ignore")
        token = re.search(r'confirm=([0-9A-Za-z_-]+)', text)
        if token:
            url2 = f"https://drive.google.com/uc?export=download&confirm={token.group(1)}&id={file_id}"
            data = fetch(url2)
        else:
            # alternate
            url2 = f"https://drive.usercontent.google.com/download?id={file_id}&export=download"
            data = fetch(url2)
    dest.write_bytes(data)
    return len(data)


def main():
    files = list_files(FOLDER_ID)
    print(f"Found {len(files)} files")
    for fid, name in files:
        # sanitize short names
        safe = re.sub(r"[^A-Za-z0-9._-]", "_", name)
        dest = OUT / safe
        try:
            n = download_file(fid, dest)
            print(f"OK {safe} ({n} bytes) id={fid}")
        except Exception as e:
            print(f"FAIL {name} id={fid}: {e}")


if __name__ == "__main__":
    main()
