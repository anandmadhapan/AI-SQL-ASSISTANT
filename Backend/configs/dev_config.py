import os
from configs.base_config import BaseConfig


def _build_db_uri() -> str:
    user     = os.getenv('DB_USER', 'postgres')
    password = os.getenv('DB_PASSWORD', '')
    host     = os.getenv('DB_HOST', 'localhost')
    port     = os.getenv('DB_PORT', '5432')
    name     = os.getenv('DB_NAME', 'postgres')
    return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{name}"


class Configuration(BaseConfig):
    DEBUG: bool = True

    DB_HOST: str = os.getenv('DB_HOST', 'localhost')
    DB_PORT: str = os.getenv('DB_PORT', '5432')
    DB_NAME: str = os.getenv('DB_NAME', 'postgres')
    DB_USER: str = os.getenv('DB_USER', 'postgres')
    DB_PASSWORD: str = os.getenv('DB_PASSWORD', '')

    DB_URI: str = _build_db_uri()
