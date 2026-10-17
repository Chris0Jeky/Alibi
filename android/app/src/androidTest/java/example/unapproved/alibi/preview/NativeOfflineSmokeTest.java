package example.unapproved.alibi.preview;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import android.content.pm.ApplicationInfo;
import android.os.SystemClock;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.File;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Real installed debug-host smoke. The runner disables emulator networking first. */
@RunWith(AndroidJUnit4.class)
public class NativeOfflineSmokeTest {
    private String evaluate(ActivityScenario<MainActivity> scenario, String expression)
            throws InterruptedException {
        AtomicReference<String> value = new AtomicReference<>();
        CountDownLatch complete = new CountDownLatch(1);
        scenario.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(
                expression, result -> {
                    value.set(result);
                    complete.countDown();
                }));
        assertTrue("WebView evaluation timed out", complete.await(10, TimeUnit.SECONDS));
        return value.get();
    }

    private void await(ActivityScenario<MainActivity> scenario, String condition)
            throws InterruptedException {
        long deadline = SystemClock.uptimeMillis() + 60000;
        while (SystemClock.uptimeMillis() < deadline) {
            if ("true".equals(evaluate(scenario, "Boolean(" + condition + ")"))) return;
            SystemClock.sleep(100);
        }
        throw new AssertionError("Native WebView condition timed out: " + condition
                + "; snapshot=" + evaluate(scenario,
                "JSON.stringify({url:location.href,ready:document.readyState,"
                + "text:document.body?.innerText?.slice(0,1500)})"));
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
            await(scenario, "globalThis.AlibiDiagnostics && document.querySelector('#main')");
            assertEquals("true", evaluate(scenario,
                    "location.origin === 'https://localhost'"
                    + " && ALIBI_BUILD_TARGET === 'android'"
                    + " && AlibiPlatform.build.flavor === 'capacitor-preview'"
                    + " && AlibiPlatform.build.sourceDirty === false"
                    + " && Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'"
                    + " && AlibiPlatform.capabilities().nativeHost === true"
                    + " && AlibiPlatform.capabilities().userDocuments === false"
                    + " && AlibiPlatform.capabilities().recoveryVault === false"));
            await(scenario, "AlibiDiagnostics.getStatus().offlineReady === true"
                    + " && document.querySelector('.device-status')?.innerText.includes('Offline ready')");
            assertEquals("true", evaluate(scenario,
                    "document.querySelector('[data-action=\"navigate\"][data-page=\"settings\"]').click(); true"));
            await(scenario, "location.hash === '#/settings' && document.querySelector('.settings-grid')");
            assertEquals("true", evaluate(scenario,
                    "!document.querySelector('link[rel=\"manifest\"]')"
                    + " && [...document.querySelectorAll('[data-action=\"install\"], [data-action=\"check-update\"]')]"
                    + ".every(node => node.getClientRects().length === 0)"));
            // evaluateJavascript does not await a Promise. Poll a test-owned result;
            // a rejection is a failure rather than silently assuming zero workers.
            evaluate(scenario, "globalThis.__alibiNativeSmokeWorkers = null;"
                    + "navigator.serviceWorker.getRegistrations()"
                    + ".then(items => { globalThis.__alibiNativeSmokeWorkers = items.length; })"
                    + ".catch(() => { globalThis.__alibiNativeSmokeWorkers = -1; }); true");
            await(scenario, "globalThis.__alibiNativeSmokeWorkers !== null");
            assertEquals("0", evaluate(scenario, "globalThis.__alibiNativeSmokeWorkers"));
            evaluate(scenario, "delete globalThis.__alibiNativeSmokeWorkers");
        }
        verifyInstalledApk(expected);
    }
}
