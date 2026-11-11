'use strict';

const SERVER = `npm start > /tmp/alibi-server.log 2>&1 &
for attempt in $(seq 1 30); do curl --fail --silent http://127.0.0.1:8797/ > /dev/null && break; sleep 1; done`.split(
  '\n',
);
const SHARDS = [
  `python tests/browser_origin.py
python tests/browser_workshop_ownership.py
ALIBI_URL=http://127.0.0.1:8797/ python tests/browser_pack_followups.py
python tests/browser_backup_ownership.py
python tests/browser_print_sheet.py
python tests/browser_completion_hooks.py
python tests/browser_observatory.py
python tests/browser_voices.py`.split('\n'),
  `python tests/browser_curation.py
python tests/browser_discovery.py
ALIBI_URL=http://127.0.0.1:8797 python tests/browser_discovery_storage.py
ALIBI_URL=http://127.0.0.1:8797 python tests/browser_narrow_layout.py
ALIBI_URL=http://127.0.0.1:8797 python tests/browser_library_focus.py
python tests/browser_folio_fallback_stub.py
ALIBI_URL=http://127.0.0.1:8797 python tests/browser_quiet_focus.py
ALIBI_URL=http://127.0.0.1:8797 python tests/browser_quiet_motion.py
ALIBI_URL=http://127.0.0.1:8797 python tests/browser_player_qa.py
ALIBI_URL=http://127.0.0.1:8797 python tests/browser_core_cabinet.py
ALIBI_URL=http://127.0.0.1:8797 python tests/browser_mobile_qa.py
ALIBI_URL=http://127.0.0.1:8797 python tests/browser_september_feedback.py
ALIBI_URL=http://127.0.0.1:8797 python tests/browser_tic_tac_toe.py
ALIBI_URL=http://127.0.0.1:8797 python tests/browser_large_nonogram.py
ALIBI_URL=http://127.0.0.1:8797 python tests/browser_expert_sudoku.py
ALIBI_URL=http://127.0.0.1:8797 python tests/browser_block_cabinet.py
ALIBI_URL=http://127.0.0.1:8797 python tests/browser_block_motion.py`.split('\n'),
  `ALIBI_URL=http://127.0.0.1:8797 python tests/browser_region_gardens.py
ALIBI_URL=http://127.0.0.1:8797 python tests/browser_invitation.py
ALIBI_URL=http://127.0.0.1:8797 python tests/browser_dominoes.py
ALIBI_URL=http://127.0.0.1:8797 python tests/browser_expert_families.py
ALIBI_URL=http://127.0.0.1:8797 python tests/browser_expert_aquarium.py
ALIBI_URL=http://127.0.0.1:8797 python tests/browser_expert_nonogram.py
ALIBI_URL=http://127.0.0.1:8797 python tests/browser_expert_controls.py
ALIBI_URL=http://127.0.0.1:8797 python tests/browser_mahjong.py
ALIBI_URL=http://127.0.0.1:8797 python tests/browser_feedback_discovery.py
python tests/browser_delivery.py
python tests/browser_theatre.py
ALIBI_URL8795=http://127.0.0.1:8797/ python tests/browser_challenges.py
python tests/browser_challenge_recovery.py
python tests/browser_challenge_library.py
python tests/browser_challenge_lifecycle.py
python tests/browser_restart.py`.split('\n'),
  `python tests/browser_boot.py
python tests/browser_quiet.py
python tests/browser_city.py
python tests/browser_city_gpu.py
python tests/browser_companions.py
python tests/browser_calm.py
python tests/browser_garden.py
python tests/browser_atmosphere.py
python tests/browser_quiet_origin.py
python tests/browser_backup_worker.py
ALIBI_URL=http://127.0.0.1:8797 python tests/browser_backup_import.py
node tools/serve-assets.cjs > /tmp/alibi-assets.log 2>&1 &
for attempt in $(seq 1 30); do curl --fail --silent http://127.0.0.1:8790/ > /dev/null && break; sleep 1; done
python tests/browser_assets.py
python tests/browser_model_assets.py
python tests/browser_asset_media.py
python tests/browser_experience.py
python tests/browser_castle_quiet_polish.py`.split('\n'),
];

function render(shard) {
  if (shard === 'server') return SERVER.join('\n') + '\n';
  if (shard === 'serial') return [...SERVER, ...SHARDS.flat()].join('\n') + '\n';
  if (!/^[1-4]$/.test(shard)) throw new Error('Unknown browser origin shard: ' + shard);
  return [...SERVER, ...SHARDS[Number(shard) - 1]].join('\n') + '\n';
}

module.exports = { render };

if (require.main === module) {
  process.stdout.write(render(process.argv[2]));
}
