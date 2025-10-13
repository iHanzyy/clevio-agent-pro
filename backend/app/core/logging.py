import structlog
import sys
import os
import logging
from app.core.config import settings

# Configure structlog
def _get_structlog_processors():
    processors = [
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
    ]

    if settings.LOG_FORMAT.lower() == "console":
        # Use basic ConsoleRenderer without problematic parameters
        processors.append(structlog.dev.ConsoleRenderer(colors=True))
    else:
        processors.append(structlog.processors.JSONRenderer())

    return processors


def setup_logging():
    """Setup logging configuration"""
    # Basic logging setup
    logging.basicConfig(
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        stream=sys.stdout,
        level=getattr(logging, settings.LOG_LEVEL.upper())
    )

    # Configure structlog
    structlog.configure(
        processors=_get_structlog_processors(),
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    log_environment = os.getenv("LOG_FORMAT", settings.LOG_FORMAT)

    # Create logger after configuration
    logger = structlog.get_logger(__name__)
    logger.info(
        "Logging initialized",
        level=settings.LOG_LEVEL,
        format=log_environment,
    )


# Initialize logger
logger = structlog.get_logger(__name__)
