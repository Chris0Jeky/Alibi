#!/usr/bin/env python3
"""Print only bounded, structured instrumentation timing and main-thread traces."""
from collections import deque
import re
import sys

prefix = re.compile(
    r"^\d\d-\d\d \d\d:\d\d:\d\d\.\d+\s+\d+\s+\d+\s+I AlibiNativeSmoke: "
)
# Only literal stages emitted by NativeOfflineSmokeTest are allowed.
ready = r"(?:boot\.ready|offline\.ready|settings\.ready|workers\.ready)"
direct = (r"(?:host\.identity|settings\.click|settings\.web-controls|"
          r"workers\.setup|workers\.count|workers\.cleanup)")
label = (rf"(?:condition=\d+ stage={ready}|eval=\d+ stage=(?:{direct}|"
         rf"condition=\d+ stage={ready}/poll=\d+))")
number = r"-?\d+"
timing = rf"(?:submit-ms|ui-dispatch-ms|ui-return-ms|callback-ms|timeout-ms)={number}"
timeout = (
    rf"timeout-ms={number} submit-ms={number} ui-dispatch-ms={number} "
    rf"ui-return-ms={number} callback-ms={number} heartbeat-ms={number} "
    rf"heartbeat-age-ms={number}"
)
message = re.compile(
    rf"^{label} (?:{timeout}|{timing}|main-state=(?:NEW|RUNNABLE|BLOCKED|WAITING|TIMED_WAITING|TERMINATED)|main-stack-unavailable)$"
)
condition_timeout = re.compile(
    rf"^condition=\d+ stage={ready} timeout-ms=\d+ polls=\d+$"
)
frame = re.compile(rf"^({label}) main\[(\d+)\]=([^\r\n]+)$")
# Emit only these fixed symbols, never source file names or arbitrary class names.
frames = {
    "android.graphics.HardwareRenderer.nSyncAndDrawFrame",
    "android.graphics.HardwareRenderer.syncAndDrawFrame",
    "android.view.ThreadedRenderer.draw",
    "android.view.ViewRootImpl.draw",
    "android.view.ViewRootImpl.performDraw",
    "android.view.ViewRootImpl.performTraversals",
    "android.os.Looper.loop",
    "android.os.Looper.loopOnce",
    "android.os.MessageQueue.next",
    "android.os.MessageQueue.nativePollOnce",
    "java.lang.Object.wait",
    "java.lang.Thread.sleep",
}

lines = deque(maxlen=40)
for raw in sys.stdin:
    match = prefix.match(raw)
    if not match:
        continue
    value = raw[match.end():].rstrip("\r\n")
    if not message.fullmatch(value) and not condition_timeout.fullmatch(value):
        item = frame.fullmatch(value)
        if not item:
            continue
        symbol = item.group(3).split("(", 1)[0]
        symbol = symbol if symbol in frames else "unlisted frame"
        value = f"{item.group(1)} main[{item.group(2)}]={symbol}"
    output = (value + "\n").encode("utf-8")
    if len(output) <= 8192:
        lines.append(output)

selected = []
size = 0
for output in reversed(lines):
    if size + len(output) > 8192:
        break
    selected.append(output)
    size += len(output)
for output in reversed(selected):
    sys.stdout.buffer.write(output)
