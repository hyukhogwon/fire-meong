#!/usr/bin/env bash
# Encode the CC0 campfire recording to AAC for the web build.
#
# The raw recording is very quiet (-35.6 LUFS, bed around -52 dB) with 0 dBFS
# crackle peaks. A static gain lifts the bed and a fast peak limiter shaves
# only the crackle transients. Do NOT use loudnorm here: its dynamic mode
# ducks the whole signal after every crackle, which is heard as dropouts
# (scripts/check-dropouts.py found 384 such windows vs 0 in the raw file).
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=assets/raw/729396__heckfricker__campfire-02.wav
OUT=public/audio/campfire.m4a
GAIN_DB=24

ffmpeg -hide_banner -loglevel error -y -i "$SRC" \
  -af "volume=${GAIN_DB}dB,alimiter=limit=0.6:attack=0.5:release=5:level=false" \
  -c:a aac -b:a 192k "$OUT"

# Regression check: the encode must not add dropouts beyond the raw file's own.
raw=$(python3 -I scripts/check-dropouts.py "$SRC" 10 | head -1 | sed 's/.*: //')
enc=$(python3 -I scripts/check-dropouts.py "$OUT" 10 | head -1 | sed 's/.*: //')
echo "dropout windows: raw=$raw encoded=$enc"
if [ "$enc" -gt "$raw" ]; then
  echo "encode added dropouts" >&2
  exit 1
fi

# Crickets (CC0, Freesound 333221): an even bed at -48.2 LUFS, LRA 1.7 LU,
# peaks far below 0 dBFS, so a plain static gain is enough (-30.2 LUFS,
# peak -17.5 dBFS). The in-app mix level is CRICKET_MIX in fire-audio.ts.
CSRC=assets/raw/333221__hdfreema__night-crickets-back-porch.aiff
COUT=public/audio/crickets.m4a
ffmpeg -hide_banner -loglevel error -y -i "$CSRC" -af "volume=18dB" -c:a aac -b:a 128k "$COUT"
craw=$(python3 -I scripts/check-dropouts.py "$CSRC" 10 | head -1 | sed 's/.*: //')
cenc=$(python3 -I scripts/check-dropouts.py "$COUT" 10 | head -1 | sed 's/.*: //')
echo "cricket dropout windows: raw=$craw encoded=$cenc"
if [ "$cenc" -gt "$craw" ]; then
  echo "cricket encode added dropouts" >&2
  exit 1
fi
