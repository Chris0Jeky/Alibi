"""Require repeated localized changes across a complete decoded motion clip."""
from pathlib import Path
import argparse,json,hashlib,shutil,subprocess,tempfile
from fractions import Fraction
from PIL import Image,ImageChops

REGIONS={'las':{'window':((.675,.03,.988,.67),.025),'falling_rain':((.675,.03,.988,.30),.0035),'train_band':((.675,.35,.988,.44),.06)},'alibi':{'steam':((.72,.40,.83,.64),.04),'flame':((.36,.58,.44,.68),.025),'glass':((.29,.4,.52,.72),.015)}}

def recurring_regions(images, fps, asset):
    """Disjoint quarters stop one corrupt frame or one early burst qualifying."""
    assert len(images)/fps>=6,'A complete clip must be decoded, not just its endpoints'
    results={}
    for name,(bounds,minimum) in REGIONS[asset].items():
        box=tuple(round(v*(images[0].width if i%2==0 else images[0].height)) for i,v in enumerate(bounds))
        crops=[im.crop(box) for im in images];windows=[]
        for quarter in range(4):
            start=quarter*len(images)//4;stop=(quarter+1)*len(images)//4
            pairs=[]
            for gap in sorted({max(1,round(fps/4)),max(1,round(fps))}):
                for first in range(start,stop-gap,max(1,round(fps/4))):
                    diff=ImageChops.difference(crops[first],crops[first+gap]);pixels=diff.tobytes()
                    fraction=sum(max(pixels[i:i+3])>=6 for i in range(0,len(pixels),3))/(diff.width*diff.height)
                    pairs.append({'first_frame':first,'second_frame':first+gap,'changed_fraction_threshold6':fraction})
            qualifying=[pair for pair in pairs if pair['changed_fraction_threshold6']>=minimum]
            # A corrupt frame can differ from several neighbours. Counting
            # those overlapping edges would turn one glitch into many events.
            independent=[]
            for i,first in enumerate(qualifying):
                endpoints={first['first_frame'],first['second_frame']}
                second=next((pair for pair in qualifying[i+1:] if endpoints.isdisjoint({pair['first_frame'],pair['second_frame']})),None)
                if second:independent=[first,second];break
            adjacent=sum(pair['second_frame']-pair['first_frame']==max(1,round(fps/4)) for pair in qualifying)
            # The two continuously moving Alibi effects must change through
            # several adjacent phases. Entry/exit around one short flash gives
            # at most two transitions even with distinct comparison endpoints.
            required_adjacent=3 if asset=='alibi' and name in ('steam','flame') else 0
            windows.append({'quarter':quarter+1,'start_frame':start,'end_frame_exclusive':stop,'qualifying_pairs':len(qualifying),'qualifying_adjacent_pairs':adjacent,'required_adjacent_pairs':required_adjacent,'independent_pairs':independent,'passes':len(independent)>=2 and adjacent>=required_adjacent,'pairs':pairs})
        # A one-way train is intentionally absent in part of its eight-second
        # loop. Rain/window and all Alibi effects must recur in every quarter.
        required=2 if asset=='las' and name=='train_band' else 4
        passing=sum(w['passes'] for w in windows)
        results[name]={'required_minimum':minimum,'required_passing_quarters':required,'passing_quarters':passing,'windows':windows,'passes':passing>=required}
    return results

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('asset',choices=['las','alibi']);parser.add_argument('video',type=Path);parser.add_argument('--output',type=Path)
    args=parser.parse_args();out=args.output or Path(tempfile.mkdtemp(prefix='readable-motion-'));out.mkdir(parents=True,exist_ok=True)
    frames=out/'decoded';frames.mkdir(exist_ok=False)
    probe=json.loads(subprocess.check_output([shutil.which('ffprobe'),'-v','error','-select_streams','v:0','-show_entries','stream=avg_frame_rate','-of','json',str(args.video)]))
    fps=float(Fraction(probe['streams'][0]['avg_frame_rate']));assert fps>0
    # Decode every frame: downsampling previously hid a single black first
    # frame at 24 fps. Diagnostics must retain the actual opening frame.
    subprocess.run([shutil.which('ffmpeg'),'-hide_banner','-loglevel','error','-n','-i',str(args.video),'-vf','scale=320:-1',str(frames/'%04d.png')],check=True)
    images=[Image.open(p).convert('RGB') for p in sorted(frames.glob('*.png'))]
    results=recurring_regions(images,fps,args.asset)
    report={'asset':args.asset,'decoded_frames':len(images),'fps':fps,'display_width':320,'video_sha256':hashlib.sha256(args.video.read_bytes()).hexdigest(),'regions':results,'human_visual_acceptance':'Separate gate; recurring encoded changes do not establish artistic quality or physical-device acceptance'}
    (out/'readability.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps(report),flush=True)
    assert all(r['passes'] for r in results.values()),'Decoded export lacks recurring readable motion across the complete clip'

if __name__=='__main__':main()
