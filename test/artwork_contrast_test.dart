import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_application_1/features/offers/widgets.dart';

void main() {
  testWidgets(
    'uploaded photo keeps its badge without a generic caption covering the artwork',
    (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SizedBox(
              width: 320,
              child: OfferArt(
                'upload-550e8400-e29b-41d4-a716-446655440000.webp',
                isSample: true,
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      final stack = tester.widget<Stack>(
        find
            .descendant(of: find.byType(OfferArt), matching: find.byType(Stack))
            .first,
      );
      final photo = stack.children.indexWhere((child) => child is Image);
      final caption = stack.children.indexWhere(
        (child) => child is Positioned && child.child is Align,
      );
      expect(photo, greaterThanOrEqualTo(0));
      expect(caption, -1);
      expect(find.byType(OfferArtworkCaption), findsNothing);
      expect(find.text('Sample offer'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
  test('caption uses opaque colours with strong contrast on any photo', () {
    const background = OfferArtworkCaption.background,
        foreground = OfferArtworkCaption.foreground;
    expect(background.a, 1);
    expect(foreground.a, 1);
    final contrast =
        (foreground.computeLuminance() + .05) /
        (background.computeLuminance() + .05);
    expect(contrast, greaterThan(7));
  });
}
