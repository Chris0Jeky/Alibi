param(
  [string]$HyperFrames = 'hyperframes',
  [string]$Ffmpeg = 'ffmpeg',
  [string]$MotionRoot = 'assets-source/library/motion'
)

$ErrorActionPreference = 'Stop'
$jobs = @(
  @{ Name = 'intro-landscape'; Resolution = 'landscape'; Width = 1280; Height = 720; At = '0,6,12,18,24,30,35.8' },
  @{ Name = 'intro-portrait'; Resolution = 'portrait'; Width = 720; Height = 1280; At = '0,6,12,18,24,30,35.8' },
  @{ Name = 'quiet-wing-landscape'; Resolution = 'landscape'; Width = 1280; Height = 720; At = '0,6,11.8' },
  @{ Name = 'quiet-wing-portrait'; Resolution = 'portrait'; Width = 720; Height = 1280; At = '0,6,11.8' },
  @{ Name = 'bridges-landscape'; Resolution = 'landscape'; Width = 1280; Height = 720; At = '0,6,11.8' },
  @{ Name = 'bridges-portrait'; Resolution = 'portrait'; Width = 720; Height = 1280; At = '0,6,11.8' },
  @{ Name = 'ambient-lamplight'; Resolution = 'landscape'; Width = 1280; Height = 720; At = '0,2.5,4.8' },
  @{ Name = 'ambient-earned-stamp'; Resolution = 'landscape'; Width = 1280; Height = 720; At = '0,2.5,4.8' }
)

foreach ($job in $jobs) {
  $source = Join-Path $MotionRoot $job.Name
  $tmp = Join-Path $MotionRoot ("renders/tmp-$($job.Name).mp4")
  $final = Join-Path $MotionRoot ("renders/alibi-$($job.Name).mp4")
  & $HyperFrames check $source --json --at $job.At --strict | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "HyperFrames check failed: $($job.Name)" }
  & $HyperFrames render $source --output $tmp --quality draft --resolution $job.Resolution --workers 1 --strict
  if ($LASTEXITCODE -ne 0) { throw "HyperFrames render failed: $($job.Name)" }
  & $Ffmpeg -y -hide_banner -loglevel error -i $tmp -vf "scale=$($job.Width):$($job.Height):flags=lanczos" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -movflags +faststart -an $final
  if ($LASTEXITCODE -ne 0) { throw "FFmpeg delivery transcode failed: $($job.Name)" }
}
