import os
from .base_config import BaseConfig

env = os.getenv('ASCEND_ENV', 'dev')

if env == 'dev':
    from .dev_config import Configuration
else:
    from .dev_config import Configuration
