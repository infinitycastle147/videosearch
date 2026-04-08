import numpy as np
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock
from click.testing import CliRunner

from videosearch.cli import cli


@pytest.fixture
def runner():
    return CliRunner()


def test_index_command_calls_build_index(runner, tmp_path):
    """'index' subcommand calls build_index with correct args."""
    with patch("videosearch.cli.build_index") as mock_build:
        result = runner.invoke(cli, ["index", str(tmp_path)])
    assert result.exit_code == 0
    mock_build.assert_called_once_with(tmp_path, interval=5)


def test_index_command_respects_interval_flag(runner, tmp_path):
    """'index --interval 10' passes interval=10 to build_index."""
    with patch("videosearch.cli.build_index") as mock_build:
        result = runner.invoke(cli, ["index", str(tmp_path), "--interval", "10"])
    assert result.exit_code == 0
    mock_build.assert_called_once_with(tmp_path, interval=10)


def test_search_command_prints_results(runner, tmp_path):
    """'search' subcommand prints ranked results."""
    fake_results = [
        {"file": "park.mp4", "timestamp_str": "0:42", "timestamp_sec": 42, "score": 0.91},
        {"file": "beach.mp4", "timestamp_str": "1:10", "timestamp_sec": 70, "score": 0.75},
    ]
    with patch("videosearch.cli.do_search", return_value=fake_results):
        result = runner.invoke(cli, ["search", str(tmp_path), "dog at the park"])

    assert result.exit_code == 0
    assert "park.mp4" in result.output
    assert "0:42" in result.output
    assert "0.91" in result.output
    assert "beach.mp4" in result.output


def test_search_command_shows_no_results_message(runner, tmp_path):
    """'search' prints helpful message when no results found."""
    with patch("videosearch.cli.do_search", return_value=[]):
        result = runner.invoke(cli, ["search", str(tmp_path), "nothing"])

    assert result.exit_code == 0
    assert "No results" in result.output


def test_search_command_exits_nonzero_on_error(runner, tmp_path):
    """'search' exits with code 1 when RuntimeError is raised (e.g. no index)."""
    with patch("videosearch.cli.do_search", side_effect=RuntimeError("No index found")):
        result = runner.invoke(cli, ["search", str(tmp_path), "query"])

    assert result.exit_code == 1
    assert "No index found" in result.output


def test_search_command_respects_top_k_and_threshold(runner, tmp_path):
    """'search' passes top_k and threshold flags to do_search."""
    with patch("videosearch.cli.do_search", return_value=[]) as mock_search:
        runner.invoke(cli, ["search", str(tmp_path), "query", "--top-k", "3", "--threshold", "0.5"])

    mock_search.assert_called_once_with(tmp_path, "query", top_k=3, threshold=0.5)
