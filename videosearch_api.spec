# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec for bundling the VideoSearch API server (ONNX backend)."""

block_cipher = None

a = Analysis(
    ["api.py"],
    pathex=["."],
    binaries=[],
    datas=[
        ("videosearch", "videosearch"),
        ("models", "models"),
    ],
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
        "onnxruntime",
        "PIL",
        "numpy",
        "videosearch",
        "videosearch.indexer",
        "videosearch.searcher",
        "videosearch.extractor",
        "videosearch.clip_tokenizer",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        "torch",
        "torchvision",
        "open_clip",
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
