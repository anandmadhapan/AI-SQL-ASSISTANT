import os


class BaseConfig(object):
    SECRET_KEY: str = os.getenv('SECRET_KEY', 'task2-secret-key')
    ALGORITHM: str = 'HS256'

    # Google Gemini via ADK
    GOOGLE_API_KEY: str = os.getenv('GOOGLE_API_KEY', '')
