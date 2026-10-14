"""Encode causal controls in a new folder; never overwrite accepted footage."""
from pathlib import Path
import argparse,json,shutil,subprocess,sys

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--accepted-video',type=Path,required=True);p.add_argument('--r1-video',type=Path);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    out=a.output.resolve();out.mkdir(parents=True,exist_ok=False);ffmpeg=shutil.which('ffmpeg');oracle=Path(__file__).with_name('assert_readable_export.py')
    still=out/'frozen-source.png'
    subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-n','-i',str(a.accepted_video),'-frames:v','1',str(still)],check=True)
    cases=[]
    for name,fps,black in [('black-first-4fps',4,True),('black-first-24fps',24,True),('all-still',24,False)]:
        clip=out/(name+'.mp4');cmd=[ffmpeg,'-hide_banner','-loglevel','error','-n','-loop','1','-framerate',str(fps),'-i',str(still),'-t','8']
        if black:cmd+=['-vf','drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill:enable=eq(n\\,0)']
        subprocess.run(cmd+['-c:v','libx264','-crf','20','-pix_fmt','yuv420p',str(clip)],check=True);cases.append((name,clip,False))
    frozen=out/'early-motion-frozen-rest.mp4'
    subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-n','-i',str(a.accepted_video),'-vf','trim=end=1,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=7','-t','8','-c:v','libx264','-crf','20','-pix_fmt','yuv420p',str(frozen)],check=True)
    cases.extend([('early-motion-frozen-rest',frozen,False),('accepted-r2',a.accepted_video,True)])
    if a.r1_video:cases.append(('retained-r1',a.r1_video,False))
    results=[]
    for name,clip,expected in cases:
        run=subprocess.run([sys.executable,str(oracle),'alibi',str(clip),'--output',str(out/name)],capture_output=True,text=True)
        (out/(name+'.log')).write_text(run.stdout+run.stderr)
        report=json.loads((out/name/'readability.json').read_text())
        # A negative must fail the temporal gate, never a missing file, decoder
        # exception or malformed-input check masquerading as a successful test.
        if not expected:assert run.returncode!=0 and 'lacks recurring readable motion' in run.stderr
        else:assert run.returncode==0,run.stderr
        results.append({'name':name,'expected_pass':expected,'actual_pass':run.returncode==0,'report':report})
    (out/'CONTROL-RESULTS.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps([{'name':r['name'],'passes':r['actual_pass']} for r in results]))

if __name__=='__main__':main()
