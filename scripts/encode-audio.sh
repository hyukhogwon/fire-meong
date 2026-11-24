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

# Rain on a tent (CC0, Freesound 251233): 24-bit WAV, -38.9 LUFS, LRA 5.6 LU,
# drop transients up to -0.5 dBFS. +8 dB lifts it near the cricket bed and a
# light limiter (0.8) only shaves drop peaks (-31.9 LUFS measured with 0.9).
# MP3 128k CBR stereo keeps the tent's stereo width at ~4 MB (WAV is 66 MB).
RSRC=assets/raw/251233__pulswelle__in-the-tent-rain.wav
ROUT=public/audio/rain.mp3
ffmpeg -hide_banner -loglevel error -y -i "$RSRC" \
  -af "volume=8dB,alimiter=limit=0.8:attack=0.5:release=5:level=false" \
  -c:a libmp3lame -b:a 128k "$ROUT"
rraw=$(python3 -I scripts/check-dropouts.py "$RSRC" 10 | head -1 | sed 's/.*: //')
renc=$(python3 -I scripts/check-dropouts.py "$ROUT" 10 | head -1 | sed 's/.*: //')
echo "rain dropout windows: raw=$rraw encoded=$renc"
if [ "$renc" -gt "$rraw" ]; then
  echo "rain encode added dropouts" >&2
  exit 1
fi

# Wind gusts (CC0, Freesound 69512): winter wind whistling through a window gap.
# Six seven-second gusts are faded and separated by half a second of silence.
WSRC=assets/raw/69512__audible-edge__winter-wind-whistling-through-window.mp3
WOUT=public/audio/wind-gusts.m4a
WFC=""
wi=0
for ws in 83.5 121.75 159.25 186.25 203.75 223.25; do
  WFC="${WFC}[0:a]atrim=start=${ws}:duration=7,asetpts=PTS-STARTPTS,afade=t=in:d=1.5,afade=t=out:st=5:d=2,apad=pad_dur=0.5[g${wi}];"
  wi=$((wi + 1))
done
WFC="${WFC}[g0][g1][g2][g3][g4][g5]concat=n=6:v=0:a=1,volume=18dB[out]"
ffmpeg -hide_banner -loglevel error -y -i "$WSRC" -filter_complex "$WFC" -map "[out]" -c:a aac -b:a 128k "$WOUT"
# Compare the encode against the identically faded and padded cut.
WTMP=$(mktemp -d)
trap 'rm -rf "$WTMP"' EXIT
WCUT="$WTMP/cut.wav"
ffmpeg -hide_banner -loglevel error -y -i "$WSRC" -filter_complex "$WFC" -map "[out]" -c:a pcm_f32le "$WCUT"
wraw=$(python3 -I scripts/check-dropouts.py "$WCUT" 10 | head -1 | sed 's/.*: //')
wenc=$(python3 -I scripts/check-dropouts.py "$WOUT" 10 | head -1 | sed 's/.*: //')
echo "wind gust dropout windows: cut=$wraw encoded=$wenc"
if [ "$wenc" -gt "$wraw" ]; then
  echo "wind gust encode added dropouts" >&2
  exit 1
fi
