# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec for bundling the VideoSearch API server."""

import os
import sys
from pathlib import Path

block_cipher = None

# Paths
venv_site = Path(sys.prefix) / "lib" / f"python{sys.version_info.major}.{sys.version_info.minor}" / "site-packages"
open_clip_dir = venv_site / "open_clip"

# Collect open_clip data files (model configs, vocab)
open_clip_datas = []
model_configs = open_clip_dir / "model_configs"
if model_configs.is_dir():
    for f in model_configs.iterdir():
        open_clip_datas.append((str(f), "open_clip/model_configs"))

bpe_file = open_clip_dir / "bpe_simple_vocab_16e6.txt.gz"
if bpe_file.exists():
    open_clip_datas.append((str(bpe_file), "open_clip"))

a = Analysis(
    ["api.py"],
    pathex=["."],
    binaries=[],
    datas=[
        ("videosearch", "videosearch"),
    ] + open_clip_datas,
    hiddenimports=[
        "uvicorn",
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        "uvicorn.lifespan.off",
        "fastapi",
        "pydantic",
        "starlette",
        "starlette.routing",
        "starlette.middleware",
        "starlette.middleware.cors",
        "anyio",
        "anyio._backends",
        "anyio._backends._asyncio",
        "open_clip",
        "torch",
        "torchvision",
        "PIL",
        "numpy",
        "json",
        "videosearch",
        "videosearch.indexer",
        "videosearch.searcher",
        "videosearch.extractor",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        "matplotlib",
        "tkinter",
        "PyQt5",
        "PyQt6",
        "PySide2",
        "PySide6",
        "IPython",
        "jupyter",
        "notebook",
        "scipy",
        "pandas",
        "sklearn",
        "tensorflow",
    ],
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="videosearch-api",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
    target_arch=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name="videosearch-api",
)
