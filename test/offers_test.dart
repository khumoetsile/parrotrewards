import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_application_1/core/api.dart';
import 'package:flutter_application_1/features/offers/discovery.dart';
import 'package:flutter_application_1/features/offers/detail.dart';
import 'package:flutter_application_1/features/claims/screens.dart';
import 'package:flutter_application_1/features/auth/screens.dart';

final shovel = {
  'id': 'offer-1',
  'slug': 'spade-shovel',
  'title': 'Spade / Shovel',
  'description': 'Fictional hardware demonstration.',
  'category': {'name': 'Hardware', 'slug': 'hardware'},
  'imageKey': 'hardware',
  'terms':
      'DEMO ONLY. Present your claim for provider validation; not payment.',
  'claimAction': 'Claim Discount',
  'discountedPrice': '100',
  'originalPrice': '200',
  'savings': '100.00',
  'discountPercent': 50,
  'isDemo': true,
  'perUserClaimLimit': 1,
  'claimTtlHours': null,
};

class OffersApi extends Api {
  @override
  Future<dynamic> get(String path) async {
    if (path == '/categories') {
      return [
        {'id': 'c1', 'name': 'Music Festivals', 'slug': 'music-festivals'},
        {'id': 'c2', 'name': 'Hardware', 'slug': 'hardware'},
        {'id': 'c3', 'name': 'Auto Spares', 'slug': 'auto-spares'},
      ];
    }
    if (path.startsWith('/offers/')) return shovel;
    if (path.startsWith('/offers?')) return [shovel];
    if (path.startsWith('/claims/')) {
      return {
        'id': 'claim-1',
        'titleSnapshot': 'Spade / Shovel',
        'discountedPrice': '100',
        'status': 'CLAIMED',
        'reference': 'PR-1234567890ABCDEF1234567890ABCDEF',
        'isDemo': true,
        'termsSnapshot': 'Prototype terms; no payment or ticket.',
        'createdAt': '2026-10-13T12:00:00Z',
        'expiresAt': null,
        'redemption': null,
      };
    }
    return <dynamic>[];
  }
}

void main() {
  testWidgets('discovery shows all three focus categories and honest savings', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiProvider.overrideWithValue(OffersApi())],
        child: const MaterialApp(home: DiscoverOffersScreen()),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Music Festivals'), findsOneWidget);
    expect(find.text('Hardware'), findsOneWidget);
    expect(find.text('Auto Spares'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Spade / Shovel'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('Price after discount'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Original price'), findsOneWidget);
    expect(find.text('BWP 100'), findsOneWidget);
    expect(find.text('BWP 200'), findsOneWidget);
    expect(find.text('Save BWP 100'), findsOneWidget);
    expect(find.text('50% OFF'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  testWidgets('detail displays prices, demo terms and claim action', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiProvider.overrideWithValue(OffersApi())],
        child: const MaterialApp(home: OfferDetailScreen(slug: 'spade-shovel')),
      ),
    );
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('Price after discount'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Original price'), findsOneWidget);
    expect(find.text('BWP 100'), findsOneWidget);
    expect(find.text('BWP 200'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Claim Discount'),
      250,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.textContaining('or an admission ticket'), findsWidgets);
    expect(tester.takeException(), isNull);
  });
  testWidgets('claim reference is presented without claiming payment', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiProvider.overrideWithValue(OffersApi())],
        child: const MaterialApp(home: ClaimDetailScreen(id: 'claim-1')),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Ready to redeem'), findsOneWidget);
    expect(find.text('PR-1234567890ABCDEF1234567890ABCDEF'), findsOneWidget);
    expect(find.textContaining('not proof of payment'), findsWidgets);
    expect(tester.takeException(), isNull);
  });
  testWidgets('onboarding scrolls on a small display with larger text', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: const TextScaler.linear(1.4)),
          child: child!,
        ),
        home: const WelcomeScreen(),
      ),
    );
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('Get started'),
      250,
      scrollable: find.byType(Scrollable).first,
    );
    expect(tester.takeException(), isNull);
  });
}
