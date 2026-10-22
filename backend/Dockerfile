FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app
COPY . ./
RUN pip install --upgrade pip && pip install .

# user-media заранее: том с файлами участников наследует владельца из образа
RUN mkdir -p /app/user-media && useradd --create-home --uid 10001 kurai && chown -R kurai:kurai /app
USER kurai

EXPOSE 8000
CMD ["gunicorn", "kurai.asgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--worker-class", "uvicorn.workers.UvicornWorker", "--access-logfile", "-", "--error-logfile", "-"]
