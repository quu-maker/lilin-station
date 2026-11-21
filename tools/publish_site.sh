#!/bin/bash
# ステーション全体を GitHub Pages に公開する：gh-pages ブランチを「main の中身＋ラジオ室の直近の音声」の
# コミット 1 つで上書きする。音声は git の履歴に入らない（古い音声は履歴ごと消える）。
# usage: tools/publish_site.sh   （リポジトリの中で。origin に push できること）
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
KEEP_DAYS=30
CUT=$(python3 -c "import datetime; print((datetime.date.today() - datetime.timedelta(days=$KEEP_DAYS)).isoformat())")
REMOTE=$(git remote get-url origin)
NAME=$(git config user.name || echo lilin-station); EMAIL=$(git config user.email || echo lilin-station@users.noreply.github.com)

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
git archive HEAD | tar -x -C "$TMP"              # what main has (committed)
mkdir -p "$TMP/radio/audio"
n=0
for f in radio/audio/*; do                        # audio files named <YYYY-MM-DD>...; keep the recent ones
  [ -e "$f" ] || continue
  d=$(basename "$f"); d=${d:0:10}
  if [[ ! "$d" < "$CUT" ]]; then cp "$f" "$TMP/radio/audio/"; n=$((n + 1)); fi
done
touch "$TMP/.nojekyll"                            # serve files as they are
cd "$TMP"
git init -q -b gh-pages
git add -A -f                                     # the audio too (the copied .gitignore keeps it off main only)
git -c user.name="$NAME" -c user.email="$EMAIL" commit -q -m "publish $(date +%F)"
if [[ -n "${GH_TOKEN:-}" ]]; then
  HOST=$(python3 -c 'from urllib.parse import urlparse; import sys; print(urlparse(sys.argv[1]).netloc)' "$REMOTE")
  AUTH=$(printf 'x-access-token:%s' "$GH_TOKEN" | base64 | tr -d '\r\n')
  git -c "http.https://$HOST/.extraheader=AUTHORIZATION: basic $AUTH" push -q -f "$REMOTE" gh-pages
else
  git push -q -f "$REMOTE" gh-pages
fi
echo "published gh-pages: $(git ls-files | wc -l | tr -d ' ') files, $n radio audio (since $CUT)"
