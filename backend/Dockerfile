
FROM python:3.12-slim

ARG APP_VERSION=1.0.0

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_VERSION=${APP_VERSION}

WORKDIR /app

# Create a non-root user with explicit numeric IDs
RUN groupadd --gid 10001 app && \
    useradd --uid 10001 \
    --gid 10001 \
    --no-create-home \
    --shell /usr/sbin/nologin app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=10001:10001 main.py .

USER 10001:10001

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
