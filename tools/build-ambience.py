"""Rebuild compact recorded ambience from checked-in CC0 sources; requires FFmpeg."""
from pathlib import Path
import array, hashlib, json, math, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'assets-source/ambience'
assets = []
for name, title, author, page, sources in [
    ('rain', 'Window rain', 'Ylmir', 'https://opengameart.org/content/rain-loopable', ['1.ogg']),
    ('waves', 'Beach waves', 'jasinski; extracts by qubodup', 'https://opengameart.org/content/beach-ocean-waves', [f'wave-0{i}.flac' for i in range(1,5)]),
]:
    samples = array.array('f')
    for source in sources:
        raw = subprocess.check_output(['ffmpeg','-v','error','-i',str(BASE/'source'/source),'-f','f32le','-ar','24000','-ac','1','-'])
        part = array.array('f'); part.frombytes(raw)
        if sys.byteorder != 'little': part.byteswap()
        if samples:
            n = 12000
            blended = array.array('f', (samples[-n+i]*(1-i/n)+part[i]*(i/n) for i in range(n)))
            samples = samples[:-n] + blended + part[n:]
        else:
            samples.extend(part)
    # Overlap each boundary, including the loop edge, with a short linear crossfade.
    # Rain is already loopable; waves get a 0.5 second wrap crossfade.
    if name == 'waves':
        n = 12000
        blended = array.array('f', (samples[-n+i]*(1-i/n)+samples[i]*(i/n) for i in range(n)))
        samples = samples[n:-n] + blended
    rms = math.sqrt(sum(x*x for x in samples)/len(samples))
    gain = min(10**(-24/20)/rms, 0.7/max(abs(x) for x in samples))
    samples = array.array('f', (x*gain for x in samples))
    if sys.byteorder != 'little': samples.byteswap()
    target = BASE / f'{name}.mp3'
    subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar','24000','-ac','1','-i','-','-map_metadata','-1','-c:a','libmp3lame','-b:a','48k',str(target)],input=samples.tobytes(),check=True)
    assets.append(dict(id=name,title=title,author=author,source=page,license='CC0-1.0',licenseUrl='https://creativecommons.org/publicdomain/zero/1.0/',file=target.relative_to(ROOT).as_posix(),bytes=target.stat().st_size,sha256=hashlib.sha256(target.read_bytes()).hexdigest(),sources=[dict(file=s,sha256=hashlib.sha256((BASE/'source'/s).read_bytes()).hexdigest()) for s in sources],duration=len(samples)/24000,auditoryReview='pending'))
(BASE/'catalogue.json').write_text(json.dumps(dict(assets=assets),indent=2)+'\n',encoding='utf-8')
print([(a['id'],a['bytes'],a['duration']) for a in assets])
