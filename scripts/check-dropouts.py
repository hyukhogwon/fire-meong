"""Find dropouts: 20ms windows whose RMS falls >DROP dB below the median of the surrounding 2s."""
import subprocess, sys, numpy as np
DROP = float(sys.argv[2]) if len(sys.argv) > 2 else 20
raw = subprocess.run(['ffmpeg','-v','error','-i',sys.argv[1],'-ac','1','-ar','44100','-f','f32le','-'],capture_output=True).stdout
x = np.frombuffer(raw, dtype=np.float32)
W = 882  # 20ms
n = len(x)//W
rms = np.sqrt(np.mean(x[:n*W].reshape(n,W)**2, axis=1)) + 1e-9
db = 20*np.log10(rms)
hits = []
for i in range(n):
    lo, hi = max(0,i-50), min(n,i+50)
    med = np.median(db[lo:hi])
    if med - db[i] > DROP:
        hits.append((i*0.02, med-db[i], db[i], med))
print(f"{sys.argv[1]}: {n} windows, overall median {np.median(db):.1f} dB, dropouts(>{DROP}dB below local median): {len(hits)}")
# group consecutive
groups=[]
for t,d,l,m in hits:
    if groups and t-groups[-1][1] <= 0.021: groups[-1][1]=t; groups[-1][2]=max(groups[-1][2],d)
    else: groups.append([t,t,d,l,m])
for g in groups[:30]: print(f"  {g[0]:7.2f}s-{g[1]+0.02:7.2f}s  depth {g[2]:.1f} dB (level {g[3]:.1f}, local median {g[4]:.1f})")
print(f"  groups: {len(groups)}")
