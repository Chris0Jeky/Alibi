export const REVISION = 'shared-signal-1';
export const CARDS = [
  {
    id: 'A0',
    role: 'archive',
    title: 'Earlier proposal · revision A',
    current: false,
    text: 'The 4 May proposal called for a pulse when both shutters were open. It was never installed. Revision B replaced this proposal on 6 May. This card describes an earlier intention, not the apparatus observed on 7 May.',
  },
  {
    id: 'A1',
    role: 'archive',
    title: 'Installed calibration · revision B',
    current: true,
    text: 'The signed 6 May installation record replaces revision A. At the inspection bell on 7 May, the source produces a pulse if and only if exactly one of the upper and lower shutters is open. Two open shutters or two closed shutters produce no pulse.',
  },
  {
    id: 'A2',
    role: 'archive',
    title: 'Installed branch inspection · revision B',
    current: true,
    text: 'The 6 May inspection certifies the installed branches for the 7 May inspection bell: if the source produces a pulse, exactly one of the Quay and Yard signals is on. If there is no pulse, both signals are off. This record does not identify which branch receives a pulse.',
  },
  {
    id: 'B1',
    role: 'field',
    title: 'Shutter observation · 7 May inspection bell',
    current: true,
    text: 'At the inspection bell, one shutter was open and the other was closed. The observer could not tell which was the upper shutter and which was the lower shutter from that position. This observation does not identify either shutter by height.',
  },
  {
    id: 'B2',
    role: 'field',
    title: 'Yard observation · 7 May inspection bell',
    current: true,
    text: 'At that same inspection bell, the Yard signal was off. The observer could not see the Quay signal or the pulse source. No observation of either is recorded here.',
  },
];

export const CLAIMS = { quay: 'The Quay signal was on.', upper: 'The upper shutter was open.' };
export const HINTS = [
  'Separate intention, installation and observation. Which cards describe the mechanism and moment you are investigating?',
  'Try to describe two different arrangements that fit your selected evidence. Does the claim change between them?',
  'An “if and only if” works in both directions. “Exactly one” excludes both and neither. What information would you ask the other reader to supply?',
];
