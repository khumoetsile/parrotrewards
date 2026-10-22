import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_application_1/features/auth/screens.dart';
import 'package:flutter_application_1/core/api.dart';

void main() {
  test('default API points to the hosted production service', () {
    expect(apiUrl, 'https://api.parrotrewards.org/api');
  });

  for (final width in [320.0, 390.0, 768.0, 1440.0, 1920.0]) {
    testWidgets('welcome and registration fit a $width pixel screen', (
      tester,
    ) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = Size(width, 800);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(const MaterialApp(home: WelcomeScreen()));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await tester.ensureVisible(find.text('Get started'));
      expect(find.text('Get started').hitTestable(), findsOneWidget);
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(home: AuthScreen(register: true)),
        ),
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Create account'));
      expect(find.text('Create account').hitTestable(), findsOneWidget);
      expect(tester.takeException(), isNull);
      final field = tester.getRect(find.byType(TextFormField).first);
      expect(field.left, greaterThanOrEqualTo(0));
      expect(field.right, lessThanOrEqualTo(width));
    });
  }
}
