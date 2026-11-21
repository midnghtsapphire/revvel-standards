#!/usr/bin/env python3
"""Install reviewed Linux scanner bytes. No sudo, package hooks or shell installers."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
import tarfile
import tempfile
import time
import urllib.parse
import urllib.request

MANIFEST = Path(__file__).with_name("install-manifest.json")
CDN_HOSTS = {"github.com", "release-assets.githubusercontent.com", "objects.githubusercontent.com"}


class InstallError(Exception):
    """Installation failed before a trusted engine could be used."""


def validate_pin(engine, pin, arm64=False):
    version = pin.get("version", "")
    if not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+", version):
        raise InstallError("invalid version pin")
    if engine == "trivy" and version == "0.69.4":
        raise InstallError("compromised Trivy release is forbidden")
    if not re.fullmatch(r"[a-f0-9]{64}", pin.get("sha256", "")):
        raise InstallError("missing or invalid SHA-256 pin")
    trivy_arch = "ARM64" if arm64 else "64bit"
    clam_arch = "aarch64" if arm64 else "x86_64"
    expected = {
        "trivy": (f"https://github.com/aquasecurity/trivy/releases/download/"
                  f"v{version}/trivy_{version}_Linux-{trivy_arch}.tar.gz", "tar.gz"),
        "clamav": (f"https://github.com/Cisco-Talos/clamav/releases/download/"
                   f"clamav-{version}/clamav-{version}.linux.{clam_arch}.deb", "deb"),
    }
    if engine not in expected or (pin.get("url"), pin.get("format")) != expected[engine]:
        raise InstallError("release URL or format is not allowlisted")
    return pin


class OfficialRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        url = urllib.parse.urlparse(newurl)
        if url.scheme != "https" or url.hostname not in CDN_HOSTS or url.username or url.password:
            raise InstallError("nonofficial download redirect refused")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def verify_checksum(archive, expected):
    digest = hashlib.sha256()
    with Path(archive).open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    if digest.hexdigest() != expected:
        raise InstallError("download checksum mismatch; bytes must not execute")


def download(pin, destination):
    opener = urllib.request.build_opener(OfficialRedirects())
    request = urllib.request.Request(pin["url"], headers={"User-Agent": "revvel-security-scanners/1"})
    started, size = time.monotonic(), 0
    with opener.open(request, timeout=60) as response, Path(destination).open("xb") as target:
        while True:
            block = response.read(1024 * 1024)
            if not block:
                break
            size += len(block)
            if size > 200 * 1024 * 1024 or time.monotonic() - started > 240:
                raise InstallError("download exceeded size or time budget")
            target.write(block)
    verify_checksum(destination, pin["sha256"])


def engine_env(home, prefix=None):
    # No inherited tokens, language import paths, Trivy settings, or candidate PATH.
    env = {"PATH": "/usr/bin:/bin", "HOME": str(home), "LC_ALL": "C", "TZ": "UTC", "TMPDIR": str(home)}
    if prefix:
        env["LD_LIBRARY_PATH"] = str(Path(prefix) / "usr/local/lib")
        # Official .deb defaults are absolute /usr/local paths. We extract into
        # a private prefix without sudo: supply its verified CVD trust roots,
        # never disable signature verification to work around relocation.
        env["CVD_CERTS_DIR"] = str(Path(prefix) / "usr/local/etc/certs")
    return env


def binary_path(engine, prefix):
    return Path(prefix) / ("trivy" if engine == "trivy" else "usr/local/bin/clamscan")


def install(engine, root, manifest=MANIFEST):
    machine = platform.machine()
    if platform.system() != "Linux" or machine not in {"x86_64", "AMD64", "aarch64", "arm64"}:
        raise InstallError("only reviewed Linux x86_64 and ARM64 platforms are supported")
    data = json.loads(Path(manifest).read_text())
    if data.get("schema") != 1 or data.get("platform") != "linux-x86_64":
        raise InstallError("invalid installation manifest")
    arm64 = machine in {"aarch64", "arm64"}
    pin = validate_pin(engine, data[engine]["arm64"] if arm64 else data[engine], arm64)
    root = Path(root).resolve()
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    # Never reuse an extracted binary on the strength of a receipt file alone.
    # Each invocation downloads and verifies the repository-pinned archive anew.
    with tempfile.TemporaryDirectory(prefix="install-", dir=root) as scratch:
        scratch = Path(scratch)
        archive = scratch / "archive"
        download(pin, archive)
        destination = root / f"{engine}-{pin['version']}-{pin['sha256'][:12]}"
        if destination.exists():
            raise InstallError("installation destination already exists; use a fresh tool directory")
        destination.mkdir(mode=0o700)
        if engine == "trivy":
            with tarfile.open(archive, "r:gz") as package:
                member = package.getmember("trivy")
                if not member.isfile() or member.size > 200 * 1024 * 1024:
                    raise InstallError("archive binary is missing or not a regular file")
                with package.extractfile(member) as source, (destination / "trivy").open("xb") as target:
                    shutil.copyfileobj(source, target)
                (destination / "trivy").chmod(0o700)
        else:
            # dpkg-deb extracts data only; it does NOT run Debian maintainer scripts.
            result = subprocess.run(["/usr/bin/dpkg-deb", "--extract", str(archive), str(destination)],
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120)
            if result.returncode:
                raise InstallError("verified ClamAV package extraction failed")
        executable = binary_path(engine, destination)
        result = subprocess.run([str(executable), "--version"], env=engine_env(scratch, destination),
                                cwd=scratch, capture_output=True, text=True, timeout=30)
        version_pattern = r"(?<![0-9.])" + re.escape(pin["version"]) + r"(?![0-9.])"
        if result.returncode or not re.search(version_pattern, result.stdout):
            raise InstallError("verified engine version mismatch or unavailable runtime dependency")
        receipt = {"engine": engine, "version": pin["version"], "archive_sha256": pin["sha256"],
                   "binary": str(executable), "prefix": str(destination)}
        (destination / "installation.json").write_text(json.dumps(receipt, indent=2) + "\n")
        return receipt


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("engine", choices=["trivy", "clamav"])
    parser.add_argument("--tools", type=Path, required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(install(args.engine, args.tools)))
        return 0
    except (InstallError, OSError, ValueError, KeyError, tarfile.TarError, subprocess.SubprocessError):
        # Exception messages can contain signed CDN URLs or local secrets: omit them.
        print("scanner installation failed; check reviewed pin, official asset availability "
              "and runtime dependencies", file=os.sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
