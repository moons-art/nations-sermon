import os
import shutil
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent

try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / ".env")
except ImportError:
    pass

OUTPUTS_DIR = BASE_DIR / "outputs"
STATIC_DIR = BASE_DIR / "static"
BGM_DIR = STATIC_DIR / "bgm"
TEST_VIDEO_DIR = STATIC_DIR / "test_video"

OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
BGM_DIR.mkdir(parents=True, exist_ok=True)
TEST_VIDEO_DIR.mkdir(parents=True, exist_ok=True)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

def find_ffmpeg_path() -> str:
    path_in_env = shutil.which("ffmpeg")
    if path_in_env:
        return path_in_env

    user_home = Path.home()
    winget_link = user_home / "AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe"
    if winget_link.exists():
        return str(winget_link)

    winget_packages = user_home / "AppData/Local/Microsoft/WinGet/Packages"
    if winget_packages.exists():
        found = list(winget_packages.glob("**/ffmpeg.exe"))
        if found:
            return str(found[0])

    local_bin = BASE_DIR / "bin" / "ffmpeg.exe"
    if local_bin.exists():
        return str(local_bin)

    return "ffmpeg"

FFMPEG_PATH = find_ffmpeg_path()
