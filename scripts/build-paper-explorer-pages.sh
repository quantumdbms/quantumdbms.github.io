#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
site_dir="${1:-$repo_root/_site}"

if [[ "$site_dir" == "/" || "$site_dir" == "$repo_root" ]]; then
  echo "Refusing unsafe output directory: $site_dir" >&2
  exit 1
fi

rm -rf "$site_dir"
mkdir -p "$site_dir"

cp "$repo_root/paper-navigator/index.html" "$site_dir/index.html"
cp "$repo_root/paper-navigator/styles.css" "$site_dir/styles.css"
cp "$repo_root/paper-navigator/app.js" "$site_dir/app.js"
cp "$repo_root/paper-navigator/papers-data.js" "$site_dir/papers-data.js"
node "$repo_root/scripts/copy-catalog-pdfs.mjs" "$repo_root" "$site_dir"

# The local navigator lives one directory below the paper library. On Pages,
# both are published at the site root, so rewrite only the generated copy.
sed -i.bak 's#\.\./Quantum_DB_Papers/#Quantum_DB_Papers/#g' "$site_dir/papers-data.js"
rm "$site_dir/papers-data.js.bak"
touch "$site_dir/.nojekyll"

echo "GitHub Pages artifact prepared at $site_dir"
