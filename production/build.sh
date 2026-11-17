#!/bin/sh
# ============================================================
#  کتاب‌خانه — آماده‌سازی نسخه تولید
#  سه فایل نهایی فرانت‌اند را از ریشه پروژه کپی می‌کند و
#  اسکریپت اتصال به API را پیش از script.js اضافه می‌کند.
#  استفاده:  sh build.sh
# ============================================================
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$(cd "$(dirname "$0")" && pwd)"

for f in index.html style.css script.js; do
  if [ ! -f "$ROOT/$f" ]; then
    echo "فایل $f در ریشه پروژه پیدا نشد." >&2
    exit 1
  fi
  cp "$ROOT/$f" "$DEST/$f"
done

# اضافه‌کردن config.js فقط یک‌بار، درست قبل از script.js
if ! grep -q 'src="config.js"' "$DEST/index.html"; then
  python3 - "$DEST/index.html" <<'PY'
import sys
path = sys.argv[1]
html = open(path, encoding='utf-8').read()
html = html.replace('<script src="script.js"></script>',
                    '<script src="config.js"></script>\n<script src="script.js"></script>', 1)
open(path, 'w', encoding='utf-8').write(html)
PY
fi

mkdir -p "$DEST/storage/backups"
cat > "$DEST/storage/.htaccess" <<'EOF'
Require all denied
EOF

echo "نسخه تولید آماده شد: $DEST"
echo "گام‌های بعدی: .env را بساز، پوشه را آپلود کن، سپس install.php را در مرورگر باز کن."
