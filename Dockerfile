FROM python:3.11-slim

# Install ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY pyproject.toml /app/pyproject.toml
WORKDIR /app
RUN pip install --no-cache-dir open-clip-torch torch torchvision numpy click Pillow

# Copy source
COPY videosearch/ /app/videosearch/
RUN pip install --no-cache-dir .

ENTRYPOINT ["videosearch"]
