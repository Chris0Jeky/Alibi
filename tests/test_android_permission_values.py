"""Signature-only permission decoding must accept enum 2, never broader flags."""
import unittest
from test_android_package import PACKAGE, APP_ID, MANIFEST


class PermissionValueTests(unittest.TestCase):
    def manifest(self, value, name=None):
        permission = f'<permission android:name="{name or APP_ID + ".DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION"}" android:protectionLevel="{value}"/>'
        return MANIFEST.replace('<application ', permission + '<application ')

    def test_exact_signature_enum_spellings_are_equivalent(self):
        for value in ('signature', '2', '0x2', '0x00000002'):
            with self.subTest(value=value):
                PACKAGE.manifest_policy(self.manifest(value), '0.15.0', 'capacitorPreview')

    def test_weak_combined_malformed_and_unknown_values_are_rejected(self):
        for value in ('normal', 'dangerous', 'signatureOrSystem', 'signature|privileged',
                      '0', '1', '3', '18', '0x12', '0x22', '-2', '2.0', '', 'true',
                      ' 2', '2 ', '0x000000020', 'signature|0'):
            with self.subTest(value=value), self.assertRaisesRegex(ValueError, 'permission'):
                PACKAGE.manifest_policy(self.manifest(value), '0.15.0', 'capacitorPreview')

    def test_enum_normalization_does_not_allow_a_different_permission(self):
        with self.assertRaisesRegex(ValueError, 'permission'):
            PACKAGE.manifest_policy(self.manifest('0x2', 'unreviewed.permission'), '0.15.0', 'capacitorPreview')


if __name__ == '__main__':
    unittest.main()
