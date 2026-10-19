"""Signature-only permission decoding must accept enum 2, never broader flags."""
import unittest
import xml.etree.ElementTree as ET
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


class LaunchModeValueTests(unittest.TestCase):
    def test_exact_single_task_enum_spellings_are_equivalent(self):
        for value in ('singleTask', '2', '0x2', '0x00000002'):
            with self.subTest(value=value):
                PACKAGE.manifest_policy(MANIFEST.replace('singleTask', value), '0.15.0', 'capacitorPreview')

    def test_other_launch_modes_and_malformed_values_are_rejected(self):
        for value in ('standard', 'singleTop', 'singleInstance', 'singleInstancePerTask',
                      '0', '1', '3', '4', '18', '0x12', '-2', '2.0', '', ' 2', '2 '):
            with self.subTest(value=value), self.assertRaisesRegex(ValueError, 'launcher'):
                PACKAGE.manifest_policy(MANIFEST.replace('singleTask', value), '0.15.0', 'capacitorPreview')

    def test_actual_sdk_decoded_debug_and_preview_manifests(self):
        from pathlib import Path
        fixtures = Path(__file__).parent / 'fixtures/native-apk-manifests'
        for filename, variant in [('debug.xml', 'debug'), ('preview.xml', 'capacitorPreview')]:
            with self.subTest(variant=variant):
                result = PACKAGE.manifest_policy((fixtures / filename).read_text(), '0.15.0', variant)
                self.assertEqual(result['debuggable'], variant == 'debug')


class EnabledValueTests(unittest.TestCase):
    def manifests(self):
        from pathlib import Path
        fixtures = Path(__file__).parent / 'fixtures/native-apk-manifests'
        for filename, variant in [('debug.xml', 'debug'), ('preview.xml', 'capacitorPreview')]:
            yield ET.fromstring((fixtures / filename).read_text()), variant

    def launcher(self, app):
        activities = [node for node in app.findall('activity')
                      if node.get(PACKAGE.ANDROID + 'name') in (APP_ID + '.MainActivity', '.MainActivity')]
        self.assertEqual(len(activities), 1)
        return activities[0]

    def test_sdk_manifests_accept_default_and_explicit_enabled_at_both_levels(self):
        for root, variant in self.manifests():
            app = root.find('application')
            activity = self.launcher(app)
            for application_enabled in (None, 'true'):
                for activity_enabled in (None, 'true'):
                    with self.subTest(variant=variant, application=application_enabled,
                                      activity=activity_enabled):
                        for node, value in [(app, application_enabled), (activity, activity_enabled)]:
                            node.attrib.pop(PACKAGE.ANDROID + 'enabled', None)
                            if value is not None:
                                node.set(PACKAGE.ANDROID + 'enabled', value)
                        result = PACKAGE.manifest_policy(ET.tostring(root, encoding='unicode'),
                                                         '0.15.0', variant)
                        self.assertEqual(result['debuggable'], variant == 'debug')

    def test_sdk_manifests_reject_disabled_application_and_launcher(self):
        for root, variant in self.manifests():
            app = root.find('application')
            for node in (app, self.launcher(app)):
                with self.subTest(variant=variant, component=node.tag):
                    node.set(PACKAGE.ANDROID + 'enabled', 'false')
                    with self.assertRaisesRegex(ValueError, 'enabled'):
                        PACKAGE.manifest_policy(ET.tostring(root, encoding='unicode'), '0.15.0', variant)
                    node.attrib.pop(PACKAGE.ANDROID + 'enabled')

    def test_sdk_manifests_reject_unresolved_or_malformed_enabled_flags(self):
        for root, variant in self.manifests():
            app = root.find('application')
            for node in (app, self.launcher(app)):
                for value in ('', 'TRUE', '1', '@bool/launcher_enabled', ' true', 'true '):
                    with self.subTest(variant=variant, component=node.tag, value=value):
                        node.set(PACKAGE.ANDROID + 'enabled', value)
                        with self.assertRaisesRegex(ValueError, 'enabled'):
                            PACKAGE.manifest_policy(ET.tostring(root, encoding='unicode'), '0.15.0', variant)
                    node.attrib.pop(PACKAGE.ANDROID + 'enabled')


if __name__ == '__main__':
    unittest.main()
