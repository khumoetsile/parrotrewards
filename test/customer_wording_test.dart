import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_application_1/features/offers/widgets.dart';
import 'package:flutter_application_1/features/offers/models.dart';

void main() {
  testWidgets('normal category artwork has no sample or development badge', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(home: Scaffold(body: OfferArt('music'))),
    );
    expect(find.text('Sample offer'), findsNothing);
    expect(find.text('DEMO'), findsNothing);
  });
  testWidgets('sample artwork is explicitly conditional on unconfirmed data', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: OfferArt('music', isSample: true)),
      ),
    );
    expect(find.text('Sample offer'), findsOneWidget);
    expect(find.text('DEMO'), findsNothing);
  });
  test('legacy sample conditions preserve the missing-provider disclosure', () {
    final text = customerTerms(
      'DEMO ONLY. Prototype example, not a confirmed live offer or partnership. Present your claim reference to the provider for prototype validation. This claim is not proof of payment or an admission ticket.',
    );
    expect(
      text,
      contains('Provider participation and availability are not confirmed.'),
    );
    expect(text, contains('not proof of payment'));
    expect(text, contains('not proof of payment or an admission ticket'));
    expect(text, isNot(contains('DEMO')));
    expect(text, isNot(contains('prototype')));
  });
}
