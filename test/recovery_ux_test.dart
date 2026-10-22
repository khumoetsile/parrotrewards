import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_application_1/core/api.dart';
import 'package:flutter_application_1/features/auth/screens.dart';

class RecoveryApi extends Api {
  final calls = <String>[];
  @override
  Future<dynamic> post(String path, dynamic body) async {
    calls.add(path);
    return {
      'message': 'If the address is registered, a recovery code has been sent.',
    };
  }
}

void main() {
  testWidgets(
    'recovery validates locally and completes both steps with a success message',
    (tester) async {
      final api = RecoveryApi();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [apiProvider.overrideWithValue(api)],
          child: const MaterialApp(home: RecoveryScreen()),
        ),
      );
      final email = find.byType(TextFormField).first;
      await tester.enterText(email, 'bad');
      await tester.tap(find.widgetWithText(FilledButton, 'Send recovery code'));
      await tester.pumpAndSettle();
      expect(api.calls, isEmpty);
      await tester.enterText(email, 'customer@example.test');
      await tester.tap(find.widgetWithText(FilledButton, 'Send recovery code'));
      await tester.pumpAndSettle();
      expect(api.calls, ['/auth/forgot-password']);
      final fields = find.byType(TextFormField);
      await tester.enterText(fields.at(0), 'a' * 64);
      await tester.enterText(fields.at(1), 'Strong-password-123');
      await tester.ensureVisible(find.text('Update password'));
      await tester.tap(find.text('Update password'));
      await tester.pumpAndSettle();
      expect(api.calls.last, '/auth/reset-password');
      expect(find.text('Password updated'), findsOneWidget);
    },
  );
}
