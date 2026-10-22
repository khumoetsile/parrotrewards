import 'dart:io';

import 'package:integration_test/integration_test_driver_extended.dart';

Future<void> main() async => integrationDriver(
  onScreenshot: (name, bytes, [args]) async {
    final folder = Directory(Platform.environment['PARROT_SCREENSHOT_OUTPUT']!);
    await folder.create(recursive: true);
    await File('${folder.path}/Android-$name.png').writeAsBytes(bytes);
    return true;
  },
);
