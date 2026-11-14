import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_application_1/features/profile/privacy.dart';

void main() {
  testWidgets(
    'deletion opens a draft addressed to the confirmed operator contact',
    (tester) async {
      Uri? opened;
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            externalLinkProvider.overrideWithValue((uri) async {
              opened = uri;
              return true;
            }),
          ],
          child: const MaterialApp(home: AccountDeletionScreen()),
        ),
      );
      expect(find.textContaining('does not immediately erase'), findsOneWidget);
      final button = find.widgetWithText(FilledButton, 'Open email request');
      await tester.ensureVisible(button);
      await tester.pumpAndSettle();
      await tester.tap(button);
      await tester.pumpAndSettle();
      expect(opened?.scheme, 'mailto');
      expect(opened?.path, 'kmolabi@gmail.com');
      expect(
        opened?.queryParameters['subject'],
        'Parrot Rewards account deletion request',
      );
      expect(
        opened?.queryParameters['body'],
        contains('[enter your account email]'),
      );
      expect(opened?.query, isNot(contains('+')));
    },
  );
  testWidgets(
    'a device without email still shows contact and copyable request',
    (tester) async {
      String? copied;
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        (call) async {
          if (call.method == 'Clipboard.setData') {
            copied = (call.arguments as Map)['text'] as String;
          }
          return null;
        },
      );
      addTearDown(
        () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
          SystemChannels.platform,
          null,
        ),
      );
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            externalLinkProvider.overrideWithValue((uri) async => false),
          ],
          child: const MaterialApp(home: AccountDeletionScreen()),
        ),
      );
      final button = find.widgetWithText(FilledButton, 'Open email request');
      await tester.ensureVisible(button);
      await tester.pumpAndSettle();
      await tester.tap(button);
      await tester.pumpAndSettle();
      expect(find.textContaining('Could not open email.'), findsOneWidget);
      final copy = find.widgetWithText(TextButton, 'Copy deletion request');
      await tester.ensureVisible(copy);
      await tester.pumpAndSettle();
      await tester.tap(copy);
      await tester.pumpAndSettle();
      expect(copied, contains('To: kmolabi@gmail.com'));
      expect(
        find.text(
          'Request copied. Paste it into your email app and send it to Parrot.',
        ),
        findsOneWidget,
      );
    },
  );
}
