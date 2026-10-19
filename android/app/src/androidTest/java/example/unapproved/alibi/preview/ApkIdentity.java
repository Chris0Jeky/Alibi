package example.unapproved.alibi.preview;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.security.MessageDigest;

/** Test-only check of the installed sourceDir, using APIs supported by the minimum OS. */
final class ApkIdentity {
    private ApkIdentity() {}

    static void verify(File installedApk, String expected) throws Exception {
        if (expected == null || !expected.matches("[0-9a-f]{64}")) {
            throw new IllegalArgumentException("An audited APK SHA-256 argument is required");
        }
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] buffer = new byte[8192];
        try (InputStream stream = new FileInputStream(installedApk)) {
            int count;
            while ((count = stream.read(buffer)) != -1) {
                digest.update(buffer, 0, count);
            }
        }
        StringBuilder actual = new StringBuilder(64);
        for (byte value : digest.digest()) {
            actual.append(Character.forDigit((value & 0xff) >>> 4, 16));
            actual.append(Character.forDigit(value & 0xf, 16));
        }
        if (!expected.equals(actual.toString())) {
            throw new AssertionError("Installed APK differs from the statically audited package");
        }
    }
}
