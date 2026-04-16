import numpy as np
import pytest

from videosearch.clip_tokenizer import tokenize


def test_tokenize_returns_correct_shape():
    """tokenize returns (1, 77) int64 array."""
    result = tokenize("a photo of a cat")
    assert result.shape == (1, 77)
    assert result.dtype == np.int64


def test_tokenize_starts_with_sot_token():
    """First token is <start_of_text> (49406)."""
    result = tokenize("hello")
    assert result[0, 0] == 49406


def test_tokenize_has_eot_token():
    """Token sequence contains <end_of_text> (49407) after the text."""
    result = tokenize("hi")
    tokens = result[0]
    non_zero = tokens[tokens != 0]
    assert non_zero[-1] == 49407


def test_tokenize_pads_to_77():
    """Short text is zero-padded to 77 tokens."""
    result = tokenize("a")
    assert result[0, -1] == 0  # last token is padding


def test_tokenize_truncates_long_text():
    """Text longer than 77 tokens is truncated, ending with eot."""
    long_text = " ".join(["word"] * 200)
    result = tokenize(long_text)
    assert result.shape == (1, 77)
    assert result[0, -1] == 49407  # last token is eot


def test_tokenize_batch():
    """tokenize handles a list of strings."""
    result = tokenize(["hello", "world"])
    assert result.shape == (2, 77)
    assert result.dtype == np.int64
