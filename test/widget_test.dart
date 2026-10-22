import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_application_1/features/auth/screens.dart';
import 'package:flutter_application_1/core/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

void main() {
  testWidgets(
    'onboarding explains discounts without promising payment or tickets',
    (tester) async {
      await tester.pumpWidget(const MaterialApp(home: WelcomeScreen()));
      expect(find.text('Get started'), findsOneWidget);
      expect(find.textContaining('My Claims'), findsOneWidget);
      expect(find.textContaining('does not confirm payment'), findsOneWidget);
    },
  );
  testWidgets('registration validates before contacting the API', (
    tester,
  ) async {
    await tester.pumpWidget(
      const ProviderScope(child: MaterialApp(home: AuthScreen(register: true))),
    );
    await tester.tap(find.text('Create account'));
    await tester.pump();
    expect(find.text('Enter your name'), findsOneWidget);
    expect(find.text('Enter a valid email'), findsOneWidget);
    expect(find.text('Use at least 12 characters'), findsOneWidget);
  });
  testWidgets('verification status is readable', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: Scaffold(body: StatusBadge('NEEDS_REVIEW'))),
    );
    expect(find.text('needs review'), findsOneWidget);
  });
}
