import click
from pathlib import Path

from .indexer import build_index
from .searcher import search as do_search
from .duplicates import find_duplicates


@click.group()
def cli():
    """Local video search using CLIP embeddings."""


@cli.command()
@click.argument("video_dir", type=click.Path(exists=True, file_okay=False, path_type=Path))
@click.option("--interval", default=5, show_default=True, help="Frame sampling interval in seconds.")
def index(video_dir: Path, interval: int) -> None:
    """Build or update the search index for VIDEO_DIR."""
    build_index(video_dir, interval=interval)


@cli.command()
@click.argument("video_dir", type=click.Path(exists=True, file_okay=False, path_type=Path))
@click.argument("query")
@click.option("--top-k", default=5, show_default=True, help="Number of results to return.")
@click.option("--threshold", default=0.2, show_default=True, help="Minimum similarity score.")
def search(video_dir: Path, query: str, top_k: int, threshold: float) -> None:
    """Search VIDEO_DIR for clips matching QUERY."""
    try:
        results = do_search(video_dir, query, top_k=top_k, threshold=threshold)
    except RuntimeError as e:
        click.echo(f"Error: {e}")
        raise SystemExit(1)

    if not results:
        click.echo(f"No results found above threshold {threshold}. Try lowering --threshold.")
        return

    click.echo(f'\nResults for: "{query}"\n')
    for i, r in enumerate(results, 1):
        is_image = r["timestamps"][0].get("type") == "image"
        if is_image:
            click.echo(f'{i:2}. {r["file"]}  (score: {r["best_score"]:.2f})  [image]')
        else:
            click.echo(f'{i:2}. {r["file"]}  (best: {r["best_score"]:.2f})')
            for t in r["timestamps"]:
                click.echo(f'      @ {t["timestamp_str"]}  (score: {t["score"]:.2f})')


@cli.command()
@click.argument("video_dir", type=click.Path(exists=True, file_okay=False, path_type=Path))
@click.option("--threshold", default=0.95, show_default=True, help="Similarity threshold (0-1).")
def duplicates(video_dir: Path, threshold: float) -> None:
    """Find duplicate or near-duplicate media in VIDEO_DIR."""
    try:
        groups = find_duplicates(video_dir, similarity_threshold=threshold)
    except RuntimeError as e:
        click.echo(f"Error: {e}")
        raise SystemExit(1)

    if not groups:
        click.echo("No duplicates found.")
        return

    click.echo(f"\nFound {len(groups)} duplicate group(s):\n")
    for i, g in enumerate(groups, 1):
        click.echo(f"Group {i} (similarity: {g['similarity']:.3f}):")
        for f in g["files"]:
            click.echo(f"  - {f}")
        click.echo()


if __name__ == "__main__":
    cli()
