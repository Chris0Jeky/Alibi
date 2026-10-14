"""Temporal oracle regressions; no art generation or network access."""
import unittest
from PIL import Image
from assert_readable_export import recurring_regions

class RecurringMotionTests(unittest.TestCase):
    def frames(self):return [Image.new('RGB',(320,320),'ivory') for _ in range(192)]
    def passes(self,frames):return all(r['passes'] for r in recurring_regions(frames,24,'alibi').values())
    def test_black_first_frame_with_frozen_rest_fails_temporal_coverage(self):
        frames=self.frames();frames[0]=Image.new('RGB',(320,320),'black')
        report=recurring_regions(frames,24,'alibi')
        self.assertFalse(all(r['passes'] for r in report.values()))
        self.assertTrue(all(r['passing_quarters']<=1 for r in report.values()))
        self.assertTrue(all(not w['passes'] for r in report.values() for w in r['windows'][1:]))
    def test_one_early_motion_burst_does_not_qualify_later_frozen_quarters(self):
        frames=self.frames()
        for i in range(24):frames[i]=Image.new('RGB',(320,320),'black' if i//6%2 else 'ivory')
        self.assertFalse(self.passes(frames))
    def test_genuine_all_still_is_rejected(self):self.assertFalse(self.passes(self.frames()))
    def test_one_transient_in_each_quarter_is_not_independent_recurring_motion(self):
        frames=self.frames()
        for i in [6,54,102,150]:frames[i]=Image.new('RGB',(320,320),'black')
        self.assertFalse(self.passes(frames))
    def test_recurring_changes_in_every_quarter_are_accepted(self):
        frames=[Image.new('RGB',(320,320),'black' if i//6%2 else 'ivory') for i in range(192)]
        self.assertTrue(self.passes(frames))

if __name__=='__main__':unittest.main()
