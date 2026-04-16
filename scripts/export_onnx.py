"""One-time script to export CLIP ViT-B-32 to ONNX format.

Requires torch and open_clip (the existing venv has them).
Run once: python scripts/export_onnx.py
Produces: models/clip_image_encoder.onnx, models/clip_text_encoder.onnx
"""

import warnings
from pathlib import Path

import numpy as np
import onnxruntime as ort
import open_clip
import torch

MODELS_DIR = Path(__file__).parent.parent / "models"


def export_image_encoder(model):
    """Export the visual (image) encoder to ONNX."""
    MODELS_DIR.mkdir(exist_ok=True)
    output_path = MODELS_DIR / "clip_image_encoder.onnx"

    dummy_image = torch.randn(1, 3, 224, 224)

    class ImageEncoder(torch.nn.Module):
        def __init__(self, clip_model):
            super().__init__()
            self.visual = clip_model.visual

        def forward(self, image):
            return self.visual(image)

    wrapper = ImageEncoder(model)
    wrapper.eval()

    torch.onnx.export(
        wrapper,
        dummy_image,
        str(output_path),
        input_names=["image"],
        output_names=["embedding"],
        dynamic_axes={"image": {0: "batch"}, "embedding": {0: "batch"}},
        opset_version=14,
        dynamo=False,
    )
    print(f"Exported image encoder: {output_path} ({output_path.stat().st_size / 1e6:.1f} MB)")
    return output_path


def export_text_encoder(model):
    """Export the text encoder to ONNX."""
    MODELS_DIR.mkdir(exist_ok=True)
    output_path = MODELS_DIR / "clip_text_encoder.onnx"

    dummy_text = torch.randint(0, 49408, (1, 77), dtype=torch.long)

    class TextEncoder(torch.nn.Module):
        def __init__(self, clip_model):
            super().__init__()
            self.clip = clip_model

        def forward(self, text):
            return self.clip.encode_text(text)

    wrapper = TextEncoder(model)
    wrapper.eval()

    torch.onnx.export(
        wrapper,
        dummy_text,
        str(output_path),
        input_names=["text"],
        output_names=["embedding"],
        dynamic_axes={"text": {0: "batch"}, "embedding": {0: "batch"}},
        opset_version=14,
        dynamo=False,
    )
    print(f"Exported text encoder: {output_path} ({output_path.stat().st_size / 1e6:.1f} MB)")
    return output_path


def validate(model, image_onnx_path, text_onnx_path):
    """Validate ONNX outputs match PyTorch outputs."""
    # Image encoder validation
    dummy_image = torch.randn(1, 3, 224, 224)
    with torch.no_grad():
        torch_img_out = model.encode_image(dummy_image).numpy()

    img_session = ort.InferenceSession(str(image_onnx_path))
    onnx_img_out = img_session.run(None, {"image": dummy_image.numpy()})[0]

    assert np.allclose(torch_img_out, onnx_img_out, atol=1e-5), \
        f"Image encoder mismatch! Max diff: {np.abs(torch_img_out - onnx_img_out).max()}"
    print(f"Image encoder validated: max diff = {np.abs(torch_img_out - onnx_img_out).max():.2e}")

    # Text encoder validation
    tokenizer = open_clip.get_tokenizer("ViT-B-32")
    tokens = tokenizer(["a photo of a cat"])
    with torch.no_grad():
        torch_text_out = model.encode_text(tokens).numpy()

    text_session = ort.InferenceSession(str(text_onnx_path))
    onnx_text_out = text_session.run(None, {"text": tokens.numpy().astype(np.int64)})[0]

    assert np.allclose(torch_text_out, onnx_text_out, atol=1e-5), \
        f"Text encoder mismatch! Max diff: {np.abs(torch_text_out - onnx_text_out).max()}"
    print(f"Text encoder validated: max diff = {np.abs(torch_text_out - onnx_text_out).max():.2e}")

    print("All validations passed!")


def main():
    print("Loading CLIP ViT-B-32...")
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", message="QuickGELU mismatch")
        model, _, _ = open_clip.create_model_and_transforms("ViT-B-32", pretrained="openai")
    model.eval()

    print("Exporting image encoder...")
    img_path = export_image_encoder(model)

    print("Exporting text encoder...")
    text_path = export_text_encoder(model)

    print("Validating...")
    validate(model, img_path, text_path)

    total_mb = (img_path.stat().st_size + text_path.stat().st_size) / 1e6
    print(f"\nTotal model size: {total_mb:.1f} MB")


if __name__ == "__main__":
    main()
