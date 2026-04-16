"""Pure-Python BPE tokenizer for CLIP ViT-B-32.

Extracted from open_clip's SimpleTokenizer. No torch dependency.
"""

import gzip
import html
import re
from functools import lru_cache
from pathlib import Path

import numpy as np

CONTEXT_LENGTH = 77
SOT_TOKEN = 49406  # <start_of_text>
EOT_TOKEN = 49407  # <end_of_text>


@lru_cache()
def _default_bpe_path() -> str:
    return str(Path(__file__).parent / "bpe_simple_vocab_16e6.txt.gz")


@lru_cache()
def _bytes_to_unicode() -> dict[int, str]:
    bs = (
        list(range(ord("!"), ord("~") + 1))
        + list(range(ord("\u00a1"), ord("\u00ac") + 1))
        + list(range(ord("\u00ae"), ord("\u00ff") + 1))
    )
    cs = bs[:]
    n = 0
    for b in range(256):
        if b not in bs:
            bs.append(b)
            cs.append(256 + n)
            n += 1
    return dict(zip(bs, [chr(c) for c in cs]))


def _get_pairs(word: tuple[str, ...]) -> set[tuple[str, str]]:
    pairs = set()
    prev = word[0]
    for char in word[1:]:
        pairs.add((prev, char))
        prev = char
    return pairs


class CLIPTokenizer:
    def __init__(self, bpe_path: str | None = None):
        bpe_path = bpe_path or _default_bpe_path()
        self.byte_encoder = _bytes_to_unicode()
        self.byte_decoder = {v: k for k, v in self.byte_encoder.items()}

        merges = gzip.open(bpe_path).read().decode("utf-8").split("\n")
        merges = merges[1 : 49152 - 256 - 2 + 1]
        merges = [tuple(merge.split()) for merge in merges]

        vocab = list(self.byte_encoder.values())
        vocab = vocab + [v + "</w>" for v in vocab]
        for merge in merges:
            vocab.append("".join(merge))
        vocab.extend(["<start_of_text>", "<end_of_text>"])

        self.encoder = dict(zip(vocab, range(len(vocab))))
        self.bpe_ranks = dict(zip(merges, range(len(merges))))
        self.cache: dict[str, str] = {}
        self.pat = re.compile(
            r"""<start_of_text>|<end_of_text>|'s|'t|'re|'ve|'m|'ll|'d|[\w]+|[\d]|[^\s\w\d]+""",
            re.IGNORECASE,
        )

    def _bpe(self, token: str) -> str:
        if token in self.cache:
            return self.cache[token]
        word = tuple(token[:-1]) + (token[-1] + "</w>",)
        pairs = _get_pairs(word)
        if not pairs:
            return token + "</w>"

        while True:
            bigram = min(pairs, key=lambda pair: self.bpe_ranks.get(pair, float("inf")))
            if bigram not in self.bpe_ranks:
                break
            first, second = bigram
            new_word: list[str] = []
            i = 0
            while i < len(word):
                try:
                    j = word.index(first, i)
                except ValueError:
                    new_word.extend(word[i:])
                    break
                new_word.extend(word[i:j])
                if word[j] == first and j < len(word) - 1 and word[j + 1] == second:
                    new_word.append(first + second)
                    i = j + 2
                else:
                    new_word.append(word[j])
                    i = j + 1
            word = tuple(new_word)
            if len(word) == 1:
                break
            pairs = _get_pairs(word)

        result = " ".join(word)
        self.cache[token] = result
        return result

    def encode(self, text: str) -> list[int]:
        text = " ".join(text.split()).strip().lower()
        tokens: list[int] = []
        for match in re.findall(self.pat, text):
            encoded = "".join(self.byte_encoder[b] for b in match.encode("utf-8"))
            tokens.extend(self.encoder[bt] for bt in self._bpe(encoded).split(" "))
        return tokens


# Module-level singleton
_tokenizer: CLIPTokenizer | None = None


def tokenize(texts: str | list[str]) -> np.ndarray:
    """Tokenize text(s) for CLIP.

    Args:
        texts: A single string or list of strings.

    Returns:
        np.ndarray of shape (batch, 77) with dtype int64.
        Tokens are padded with zeros and wrapped with SOT/EOT.
    """
    global _tokenizer
    if _tokenizer is None:
        _tokenizer = CLIPTokenizer()

    if isinstance(texts, str):
        texts = [texts]

    result = np.zeros((len(texts), CONTEXT_LENGTH), dtype=np.int64)
    for i, text in enumerate(texts):
        tokens = [SOT_TOKEN] + _tokenizer.encode(text) + [EOT_TOKEN]
        if len(tokens) > CONTEXT_LENGTH:
            tokens = tokens[:CONTEXT_LENGTH]
            tokens[-1] = EOT_TOKEN
        result[i, : len(tokens)] = tokens

    return result
