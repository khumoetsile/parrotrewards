import 'dart:io';

import 'package:go_router/go_router.dart';

import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';
import 'package:integration_test/integration_test.dart';
import 'package:flutter_application_1/main.dart';
import 'package:flutter_application_1/features/receipts/capture.dart';
import 'package:flutter_application_1/core/api.dart';

class FixturePicker extends ImagePicker {
  final String path;
  FixturePicker(this.path);
  @override
  Future<XFile?> pickImage({
    required ImageSource source,
    double? maxWidth,
    double? maxHeight,
    int? imageQuality,
    CameraDevice preferredCameraDevice = CameraDevice.rear,
    bool requestFullMetadata = true,
  }) async => XFile(path);
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'customer registers, resolves QR, submits receipt and observes review on Android',
    (tester) async {
      const qr = String.fromEnvironment('QA_QR');
      expect(
        qr,
        isNotEmpty,
        reason: 'Generate ignored local QA configuration first.',
      );
      final stamp = DateTime.now().microsecondsSinceEpoch;
      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      canvas.drawRect(
        const Rect.fromLTWH(0, 0, 1000, 650),
        Paint()..color = Colors.white,
      );
      final lines = [
        'Demo Pula Market',
        'Receipt No: ANDROID-$stamp',
        DateTime.now().toUtc().toIso8601String().substring(0, 10),
        'Groceries',
        'TOTAL BWP 123.45',
        'Fictional integration receipt',
      ];
      for (var i = 0; i < lines.length; i++) {
        final text = TextPainter(
          text: TextSpan(
            text: lines[i],
            style: const TextStyle(color: Colors.black, fontSize: 40),
          ),
          textDirection: TextDirection.ltr,
        )..layout(maxWidth: 900);
        text.paint(canvas, Offset(60, 60 + i * 80));
      }
      final fixture = await recorder.endRecording().toImage(1000, 650);
      final bytes = (await fixture.toByteData(format: ui.ImageByteFormat.png))!;
      final file = File('${Directory.systemTemp.path}/pula-qa-receipt.jpg');
      await file.writeAsBytes(bytes.buffer.asUint8List());
      fixture.dispose();
      final api = Api();
      await api.storage.delete(key: 'pendingPromo');
      await api.clear(); // Only this local application's test session tokens.
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            apiProvider.overrideWithValue(api),
            imagePickerProvider.overrideWithValue(FixturePicker(file.path)),
          ],
          child: const ParrotRewardsApp(),
        ),
      );
      Future<void> waitFor(Finder finder) async {
        for (var i = 0; i < 90; i++) {
          await tester.pump(const Duration(milliseconds: 500));
          if (finder.evaluate().isNotEmpty) return;
        }
        expect(finder, findsWidgets);
      }

      await waitFor(find.text('Get started'));
      await tester.tap(find.text('Get started'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Your name'),
        'Fictional Android QA',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email address'),
        'android-$stamp@example.test',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Password'),
        'Local-qa-$stamp',
      );
      await tester.ensureVisible(find.text('Create account'));
      await tester.tap(find.text('Create account'));
      await waitFor(find.text('Featured offers'));
      final homeContext = tester.element(find.text('Featured offers'));
      GoRouter.of(homeContext).go('/receipt-home');
      await waitFor(find.text('Scan & record purchase'));
      await tester.tap(find.text('Scan & record purchase'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.widgetWithText(TextField, 'QR text (alternative to camera)'),
        qr,
      );
      await tester.tap(find.text('Identify shop'));
      await waitFor(find.text('Demo Pula Market — Central'));
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Total paid'),
        '123.45',
      );
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pumpAndSettle();
      final captureScroll = find
          .descendant(
            of: find.byType(CaptureScreen),
            matching: find.byType(Scrollable),
          )
          .first;
      await tester.scrollUntilVisible(
        find.text('Choose photo'),
        200,
        scrollable: captureScroll,
      );
      await tester.tap(find.text('Choose photo'));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Submit purchase'),
        200,
        scrollable: captureScroll,
      );
      await tester.tap(find.text('Submit purchase'));
      await waitFor(find.text('Purchase details'));
      await waitFor(find.text('NEEDS REVIEW'));
      expect(find.text('BWP 123.45'), findsOneWidget);
      expect(find.textContaining('independent review'), findsOneWidget);
      // Fixture picker verifies upload/network/UI. Camera hardware and permission prompts remain manual QA.
    },
  );
}
