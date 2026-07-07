"""pytest 配置"""
import sys
from pathlib import Path

# 确保 backend 包可被 import
sys.path.insert(0, str(Path(__file__).parent.parent))