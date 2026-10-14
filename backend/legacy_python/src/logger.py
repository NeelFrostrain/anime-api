import logging
from logging.handlers import RotatingFileHandler
import os
import sys
from datetime import datetime

# Root directory of the project
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGS_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOGS_DIR, exist_ok=True)

MAIN_LOG_PATH = os.path.join(LOGS_DIR, "api.log")
ERROR_LOG_PATH = os.path.join(LOGS_DIR, "errors.log")

# Enable color output on Windows terminals if possible
try:
    import colorama
    colorama.just_fix_windows_console()
except Exception:
    pass

# ANSI color codes
RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
MAGENTA = "\033[95m"
BLUE = "\033[94m"


class ColoredConsoleFormatter(logging.Formatter):
    """Clean, high-visibility formatter for console output."""
    LEVEL_COLORS = {
        logging.DEBUG: CYAN,
        logging.INFO: GREEN,
        logging.WARNING: YELLOW,
        logging.ERROR: RED,
        logging.CRITICAL: BOLD + RED,
    }

    def format(self, record):
        color = self.LEVEL_COLORS.get(record.levelno, RESET)
        time_str = datetime.fromtimestamp(record.created).strftime("%Y-%m-%d %H:%M:%S")
        level_str = f"[{record.levelname:<5}]"

        tag = getattr(record, "tag", "API")
        tag_color = MAGENTA if tag in ("PROXY", "RACE") else (BLUE if tag == "EXTRACT" else CYAN)
        tag_str = f" {tag_color}[{tag}]{RESET}"

        msg = record.getMessage()
        if record.exc_info and not record.exc_text:
            record.exc_text = self.formatException(record.exc_info)
        if record.exc_text:
            msg += f"\n{record.exc_text}"

        return f"{DIM}{time_str}{RESET} {color}{level_str}{RESET}{tag_str} {msg}"


class PlainFileFormatter(logging.Formatter):
    """Detailed timestamped formatter for disk files without ANSI escape sequences."""
    def format(self, record):
        time_str = datetime.fromtimestamp(record.created).strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        tag = getattr(record, "tag", "API")
        msg = record.getMessage()
        if record.exc_info and not record.exc_text:
            record.exc_text = self.formatException(record.exc_info)
        if record.exc_text:
            msg += f"\n{record.exc_text}"
        return f"[{time_str}] [{record.levelname:<5}] [{tag}] {msg}"


# Singleton custom logger
logger = logging.getLogger("kuhi_anime_api")
logger.setLevel(logging.DEBUG)
logger.propagate = False  # Avoid duplicating in root logger handlers

if not logger.handlers:
    # 1. Console Output
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(ColoredConsoleFormatter())
    logger.addHandler(console_handler)

    # 2. Main Persistent Log (api.log) - 10MB rotation, keeps last 5 backups
    main_file_handler = RotatingFileHandler(
        MAIN_LOG_PATH,
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    main_file_handler.setLevel(logging.INFO)
    main_file_handler.setFormatter(PlainFileFormatter())
    logger.addHandler(main_file_handler)

    # 3. Dedicated Error Log (errors.log) - Keeps only warnings and errors
    error_file_handler = RotatingFileHandler(
        ERROR_LOG_PATH,
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    error_file_handler.setLevel(logging.WARNING)
    error_file_handler.setFormatter(PlainFileFormatter())
    logger.addHandler(error_file_handler)


def log_info(msg: str, tag: str = "API"):
    logger.info(msg, extra={"tag": tag})


def log_warn(msg: str, tag: str = "API"):
    logger.warning(msg, extra={"tag": tag})


def log_error(msg: str, tag: str = "API", exc: Exception | None = None):
    logger.error(msg, extra={"tag": tag}, exc_info=exc is not None)


def log_debug(msg: str, tag: str = "API"):
    logger.debug(msg, extra={"tag": tag})


def get_recent_logs(max_lines: int = 150) -> list[str]:
    """Retrieve the latest lines from api.log for the API and dashboard."""
    if not os.path.exists(MAIN_LOG_PATH):
        return ["No logs written yet."]
    try:
        with open(MAIN_LOG_PATH, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
            return [line.rstrip("\r\n") for line in lines[-max_lines:]]
    except Exception as e:
        return [f"Failed to read logs: {e}"]


def get_log_stats() -> dict:
    """Return file size and status of logs on disk."""
    stats = {
        "logs_dir": LOGS_DIR,
        "api_log": {"path": MAIN_LOG_PATH, "exists": os.path.exists(MAIN_LOG_PATH), "size_kb": 0},
        "errors_log": {"path": ERROR_LOG_PATH, "exists": os.path.exists(ERROR_LOG_PATH), "size_kb": 0},
    }
    if stats["api_log"]["exists"]:
        stats["api_log"]["size_kb"] = round(os.path.getsize(MAIN_LOG_PATH) / 1024, 2)
    if stats["errors_log"]["exists"]:
        stats["errors_log"]["size_kb"] = round(os.path.getsize(ERROR_LOG_PATH) / 1024, 2)
    return stats


class EndpointFilter(logging.Filter):
    """Filter out noisy repetitive poll requests like /logs/raw and static assets."""
    def filter(self, record: logging.LogRecord) -> bool:
        msg = record.getMessage()
        return not any(p in msg for p in ("/logs/raw", "/logs/stats", "/logs?", "GET /logs HTTP"))


def silence_uvicorn_access_spam():
    """Silences noisy uvicorn access stdout logs while allowing our unified logger to handle HTTP requests."""
    access_logger = logging.getLogger("uvicorn.access")
    access_logger.addFilter(EndpointFilter())
    for h in access_logger.handlers:
        h.addFilter(EndpointFilter())
    # Silence default uvicorn.access stdout so our middleware can log cleanly
    access_logger.propagate = False
    access_logger.setLevel(logging.WARNING)

