import 'package:flutter/material.dart';

import 'offers_test.dart' show OffersApi;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_application_1/core/api.dart';
import 'package:flutter_application_1/core/routing.dart';
import 'package:flutter_application_1/features/auth/state.dart';
import 'package:flutter_application_1/main.dart';

class ProfileApi extends Api {
  @override
  Future<dynamic> get(String path) async => <dynamic>[];
}

class ProfileSession extends Session {
  ProfileSession(super.api) {
    state = {
      'name': 'Original Customer',
      'email': 'customer@example.test',
      'notificationEnabled': true,
    };
  }
}

void main() {
  testWidgets(
    'account tab protects edits and confirmed discard restores saved preferences',
    (tester) async {
      final api = ProfileApi();
      final container = ProviderContainer(
        overrides: [
          apiProvider.overrideWithValue(api),
          sessionProvider.overrideWith((ref) => ProfileSession(api)),
          launchRouteProvider.overrideWithValue('/profile'),
        ],
      );
      addTearDown(container.dispose);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const ParrotRewardsApp(),
        ),
      );
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextFormField), 'Unsaved Customer');
      await tester.tap(find.text('Discover'));
      await tester.pumpAndSettle();
      expect(find.text('Leave unsaved preferences?'), findsOneWidget);
      await tester.tap(find.text('Keep editing'));
      await tester.pumpAndSettle();
      expect(find.text('Unsaved Customer'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.text('Sign out'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
      await tester.drag(find.byType(Scrollable).first, const Offset(0, -180));
      await tester.pumpAndSettle();
      expect(find.text('Sign out').hitTestable(), findsOneWidget);
      await tester.tap(find.text('Sign out'));
      await tester.pumpAndSettle();
      expect(find.text('Leave unsaved preferences?'), findsOneWidget);
      await tester.tap(find.text('Keep editing'));
      await tester.pumpAndSettle();
      expect(container.read(sessionProvider), isNotNull);
      await tester.tap(find.text('Discover'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Discard changes'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Account'));
      await tester.pumpAndSettle();
      expect(find.text('Original Customer'), findsOneWidget);
      expect(find.text('Unsaved Customer'), findsNothing);
    },
  );
  testWidgets(
    'real offer route keeps the primary menu reachable above its claim action',
    (tester) async {
      final api = OffersApi();
      final container = ProviderContainer(
        overrides: [
          apiProvider.overrideWithValue(api),
          sessionProvider.overrideWith((ref) => ProfileSession(api)),
          launchRouteProvider.overrideWithValue('/home'),
        ],
      );
      addTearDown(container.dispose);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const ParrotRewardsApp(),
        ),
      );
      await tester.pumpAndSettle();
      container.read(routerProvider).push('/offers/spade-shovel');
      await tester.pumpAndSettle();
      expect(find.text('Discover').hitTestable(), findsOneWidget);
      expect(find.text('My Claims').hitTestable(), findsOneWidget);
      await tester.tap(find.text('Account'));
      await tester.pumpAndSettle();
      expect(find.text('Your account'), findsOneWidget);
    },
  );
}
