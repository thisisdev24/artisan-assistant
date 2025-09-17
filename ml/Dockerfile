# Use official Python image (has python -> python3)
FROM python:3.11-slim

WORKDIR /app

# Install system deps needed by some ML packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN python -m pip install --upgrade pip
RUN pip install -r requirements.txt

# Copy code
COPY . .

# Default command (you can override in docker-compose or at runtime)
CMD ["python", "embed_prototype.py"]
