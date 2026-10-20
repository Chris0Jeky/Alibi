package example.unapproved.alibi.preview;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import android.content.pm.ApplicationInfo;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.File;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Real installed debug-host smoke. The runner disables emulator networking first. */
@RunWith(AndroidJUnit4.class)
public class NativeOfflineSmokeTest {
    private static final String TAG = "AlibiNativeSmoke";
    private int evaluationSequence;
    private int conditionSequence;

    private static void trace(String message) {
        try {
            Log.i(TAG, message.length() > 1200 ? message.substring(0, 1200) : message);
        } catch (RuntimeException ignored) {
            // Diagnostic output must not replace the test's result or failure.
        }
    }

    private static final class UiHeartbeat implements Runnable {
        private Handler handler;
        private boolean active;
        private final AtomicLong last = new AtomicLong(-1);

        synchronized void start() {
            try {
                handler = new Handler(Looper.getMainLooper());
                active = true;
                handler.post(this);
            } catch (RuntimeException ignored) {
                active = false;
            }
        }

        @Override
        public synchronized void run() {
            if (!active) return;
            last.set(SystemClock.elapsedRealtime());
            try {
                handler.postDelayed(this, 1000);
            } catch (RuntimeException ignored) {
                active = false;
            }
        }

        synchronized void stop() {
            active = false;
            try {
                if (handler != null) handler.removeCallbacks(this);
            } catch (RuntimeException ignored) {
                // The inactive flag also prevents any queued callback from rescheduling.
            }
        }
    }

    private static void traceMainThread(String label) {
        try {
            Thread main = Looper.getMainLooper().getThread();
            trace(label + " main-state=" + main.getState());
            StackTraceElement[] stack = main.getStackTrace();
            for (int i = 0; i < Math.min(stack.length, 24); i++)
                trace(label + " main[" + i + "]=" + stack[i]);
        } catch (RuntimeException ignored) {
            trace(label + " main-stack-unavailable");
        }
    }

    private String evaluate(ActivityScenario<MainActivity> scenario, String stage, String expression)
            throws InterruptedException {
        String label = "eval=" + (++evaluationSequence) + " stage=" + stage;
        long submitted = SystemClock.elapsedRealtime();
        AtomicLong dispatched = new AtomicLong(-1);
        AtomicLong returned = new AtomicLong(-1);
        AtomicLong callback = new AtomicLong(-1);
        AtomicReference<String> value = new AtomicReference<>();
        CountDownLatch complete = new CountDownLatch(1);
        UiHeartbeat heartbeat = new UiHeartbeat();
        trace(label + " submit-ms=" + submitted);
        try {
            heartbeat.start();
            scenario.onActivity(activity -> {
                dispatched.set(SystemClock.elapsedRealtime());
                trace(label + " ui-dispatch-ms=" + dispatched.get());
                activity.getBridge().getWebView().evaluateJavascript(expression, result -> {
                    callback.set(SystemClock.elapsedRealtime());
                    value.set(result);
                    complete.countDown();
                    trace(label + " callback-ms=" + callback.get());
                });
                returned.set(SystemClock.elapsedRealtime());
                trace(label + " ui-return-ms=" + returned.get());
            });
            boolean completed = complete.await(10, TimeUnit.SECONDS);
            if (!completed) {
                long now = SystemClock.elapsedRealtime();
                long beat = heartbeat.last.get();
                trace(label + " timeout-ms=" + now + " submit-ms=" + submitted
                        + " ui-dispatch-ms=" + dispatched.get() + " ui-return-ms=" + returned.get()
                        + " callback-ms=" + callback.get() + " heartbeat-ms=" + beat
                        + " heartbeat-age-ms=" + (beat < 0 ? -1 : now - beat));
                traceMainThread(label);
            }
            assertTrue("WebView evaluation timed out", completed);
            return value.get();
        } finally {
            heartbeat.stop();
        }
    }

    private void await(ActivityScenario<MainActivity> scenario, String stage, String condition)
            throws InterruptedException {
        long deadline = SystemClock.uptimeMillis() + 60000;
        String label = "condition=" + (++conditionSequence) + " stage=" + stage;
        trace(label + " begin-ms=" + SystemClock.elapsedRealtime() + " expression=" + condition);
        int poll = 0;
        while (SystemClock.uptimeMillis() < deadline) {
            if ("true".equals(evaluate(scenario, label + "/poll=" + (++poll),
                    "Boolean(" + condition + ")"))) {
                trace(label + " complete-ms=" + SystemClock.elapsedRealtime() + " polls=" + poll);
                return;
            }
            SystemClock.sleep(100);
        }
        trace(label + " timeout-ms=" + SystemClock.elapsedRealtime() + " polls=" + poll);
        traceMainThread(label);
        throw new AssertionError("Native WebView condition timed out: " + condition);
    }

    private void verifyInstalledApk(String expected) throws Exception {
        ApplicationInfo installed = InstrumentationRegistry.getInstrumentation()
                .getTargetContext().getApplicationInfo();
        assertEquals("example.unapproved.alibi.preview", installed.packageName);
        assertTrue("This smoke requires the audited standalone APK, not extra splits",
                installed.splitSourceDirs == null || installed.splitSourceDirs.length == 0);
        ApkIdentity.verify(new File(installed.sourceDir), expected);
    }

    @Test
    public void nativeHostBootsAndNavigatesOffline() throws Exception {
        String expected = InstrumentationRegistry.getArguments().getString("alibiExpectedApkSha256");
        verifyInstalledApk(expected);
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            await(scenario, "boot.ready", "globalThis.AlibiDiagnostics && document.querySelector('#main')");
            assertEquals("true", evaluate(scenario, "host.identity",
                    "location.origin === 'https://localhost'"
                    + " && ALIBI_BUILD_TARGET === 'android'"
                    + " && AlibiPlatform.build.flavor === 'capacitor-preview'"
                    + " && AlibiPlatform.build.sourceDirty === false"
                    + " && Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'"
                    + " && AlibiPlatform.capabilities().nativeHost === true"
                    + " && AlibiPlatform.capabilities().userDocuments === false"
                    + " && AlibiPlatform.capabilities().recoveryVault === false"));
            await(scenario, "offline.ready", "AlibiDiagnostics.getStatus().offlineReady === true"
                    + " && document.querySelector('.device-status')?.innerText.includes('Offline ready')");
            assertEquals("true", evaluate(scenario, "settings.click",
                    "document.querySelector('[data-action=\"navigate\"][data-page=\"settings\"]').click(); true"));
            await(scenario, "settings.ready", "location.hash === '#/settings' && document.querySelector('.settings-grid')");
            assertEquals("true", evaluate(scenario, "settings.web-controls",
                    "!document.querySelector('link[rel=\"manifest\"]')"
                    + " && [...document.querySelectorAll('[data-action=\"install\"], [data-action=\"check-update\"]')]"
                    + ".every(node => node.getClientRects().length === 0)"));
            // evaluateJavascript does not await a Promise. Poll a test-owned result;
            // a rejection is a failure rather than silently assuming zero workers.
            evaluate(scenario, "workers.setup", "globalThis.__alibiNativeSmokeWorkers = null;"
                    + "navigator.serviceWorker.getRegistrations()"
                    + ".then(items => { globalThis.__alibiNativeSmokeWorkers = items.length; })"
                    + ".catch(() => { globalThis.__alibiNativeSmokeWorkers = -1; }); true");
            await(scenario, "workers.ready", "globalThis.__alibiNativeSmokeWorkers !== null");
            assertEquals("0", evaluate(scenario, "workers.count", "globalThis.__alibiNativeSmokeWorkers"));
            evaluate(scenario, "workers.cleanup", "delete globalThis.__alibiNativeSmokeWorkers");
        }
        verifyInstalledApk(expected);
    }
}
