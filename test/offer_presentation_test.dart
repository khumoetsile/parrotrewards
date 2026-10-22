import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_application_1/features/offers/widgets.dart';

void main() {
  testWidgets('prices are labelled original first and after discount second', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: OfferPrices(originalPrice: '200.00', discountedPrice: '100.00'),
        ),
      ),
    );
    expect(find.text('Original price'), findsOneWidget);
    expect(find.text('Price after discount'), findsOneWidget);
    expect(
      tester.getTopLeft(find.text('Original price')).dx,
      lessThan(tester.getTopLeft(find.text('Price after discount')).dx),
    );
    expect(find.text('BWP 200'), findsOneWidget);
    expect(find.text('BWP 100'), findsOneWidget);
  });
  testWidgets('unknown legacy original price is not invented', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: OfferPrices(originalPrice: null, discountedPrice: '140'),
        ),
      ),
    );
    expect(find.text('Not supplied'), findsOneWidget);
    expect(find.text('BWP 140'), findsOneWidget);
  });
  testWidgets('offer artwork keeps the fixed landscape ratio', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: SizedBox(width: 320, child: OfferArt('hardware'))),
      ),
    );
    final size = tester.getSize(find.byType(OfferArt));
    expect(size.width / size.height, closeTo(1.6, .001));
  });
  testWidgets('prices fit a small phone with large text', (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      MaterialApp(
        home: MediaQuery(
          data: const MediaQueryData(textScaler: TextScaler.linear(1.8)),
          child: const Scaffold(
            body: Padding(
              padding: EdgeInsets.all(16),
              child: OfferPrices(
                originalPrice: '200.00',
                discountedPrice: '100.00',
              ),
            ),
          ),
        ),
      ),
    );
    expect(tester.takeException(), isNull);
  });
}
