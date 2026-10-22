import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_application_1/core/api.dart';
import 'package:flutter_application_1/core/routing.dart';
import 'package:flutter_application_1/main.dart';
import 'package:flutter_application_1/features/offers/discovery.dart';
import 'package:flutter_application_1/features/offers/detail.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'BNR promotional link registers a customer, saves a claim and keeps it in My Claims',
    (tester) async {
      final api = Api();
      await api.clear();
      await api.storage.delete(key: 'pendingPromo');
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            apiProvider.overrideWithValue(api),
            launchRouteProvider.overrideWithValue(
              '/promo/bnr-demo?ref=bnr-ticket-demo-share',
            ),
          ],
          child: const ParrotRewardsApp(),
        ),
      );
      Future<void> waitFor(Finder target) async {
        for (var i = 0; i < 100; i++) {
          await tester.pump(const Duration(milliseconds: 400));
          if (target.evaluate().isNotEmpty) return;
        }
        expect(target, findsWidgets);
      }

      await waitFor(find.text('Create account'));
      final stamp = DateTime.now().microsecondsSinceEpoch;
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Your name'),
        'Fictional Parrot QA',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email address'),
        'parrot-$stamp@example.test',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Password'),
        'Parrot-qa-$stamp',
      );
      await tester.ensureVisible(find.text('Create account'));
      await tester.tap(find.text('Create account'));
      await waitFor(find.text('BNR Ticket'));
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pumpAndSettle();
      expect(find.text('BWP 140'), findsOneWidget);
      final offerScroll = find
          .descendant(
            of: find.byType(OfferDetailScreen),
            matching: find.byType(Scrollable),
          )
          .first;
      await tester.scrollUntilVisible(
        find.text('Claim Ticket Discount'),
        250,
        scrollable: offerScroll,
      );
      await tester.tap(find.text('Claim Ticket Discount'));
      await waitFor(find.text('Your discount claim'));
      await waitFor(find.text('CLAIMED'));
      await tester.pumpAndSettle();
      expect(find.text('BWP 140'), findsOneWidget);
      expect(find.textContaining('not proof of payment'), findsWidgets);
      final references = find.byWidgetPredicate(
        (w) => w is SelectableText && (w.data ?? '').startsWith('PR-'),
      );
      expect(references, findsOneWidget);
      final reference = (tester.widget(references) as SelectableText).data!;
      final claimContext = tester.element(find.text('Your discount claim'));
      GoRouter.of(claimContext).go('/claims');
      await waitFor(find.text('BNR Ticket'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('BNR Ticket'));
      await waitFor(find.text(reference));
      final router = GoRouter.of(
        tester.element(find.text('Your discount claim')),
      );
      router.go('/home');
      await waitFor(find.text('Featured offers'));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Gobo Motho Ticket'),
        240,
        scrollable: find
            .descendant(
              of: find.byType(DiscoverOffersScreen),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      expect(find.text('BWP 140'), findsWidgets);
      await tester.scrollUntilVisible(
        find.text('Spade / Shovel'),
        240,
        scrollable: find
            .descendant(
              of: find.byType(DiscoverOffersScreen),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      expect(find.text('BWP 100'), findsWidgets);
      expect(find.text('50% OFF'), findsWidgets);
      // Existing authenticated customer follows a second promotion without registration.
      router.go('/promo/gobo-demo');
      await waitFor(find.text('Offer details'));
      await waitFor(find.text('Gobo Motho Ticket'));
      await tester.pumpAndSettle();
      expect(find.text('Create account'), findsNothing);
    },
  );
}
