import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import 'package:flutter_application_1/core/api.dart';
import 'package:flutter_application_1/features/auth/screens.dart';
import 'package:flutter_application_1/features/auth/state.dart';
import 'package:flutter_application_1/features/offers/shop_discounts.dart';

import 'offers_test.dart' show shovel;

class ShopApi extends Api {
  bool unavailable = false, empty = false;
  final codes = <String>[];
  @override
  Future<dynamic> post(String path, dynamic data) async {
    codes.add(data['token']);
    if (unavailable) {
      throw DioException(
        requestOptions: RequestOptions(path: path),
        response: Response(
          requestOptions: RequestOptions(path: path),
          statusCode: 404,
          data: {
            'error': {'message': 'This shop code is unavailable.'},
          },
        ),
      );
    }
    return {
      'shop': {
        'id': 'shop-a',
        'name': 'Central branch',
        'address': 'Main Road',
        'merchant': {'name': 'Sample shop'},
      },
      'offers': empty ? [] : [shovel],
      'page': 1,
      'totalPages': 1,
    };
  }
}

class SignedInSession extends Session {
  SignedInSession(super.api);
  @override
  Future<bool> restore() async => false;
  @override
  Future<void> login(String email, String password, {String? name}) async {
    state = {'role': 'CUSTOMER', 'name': 'Tester'};
  }
}

void main() {
  testWidgets(
    'a scanned shop shows its items and preserves the selected item through sign-in',
    (tester) async {
      tester.view.physicalSize = const Size(432, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final api = ShopApi();
      final container = ProviderContainer(
        overrides: [
          apiProvider.overrideWithValue(api),
          sessionProvider.overrideWith((ref) => SignedInSession(api)),
        ],
      );
      final router = GoRouter(
        initialLocation: '/shop',
        routes: [
          GoRoute(
            path: '/shop',
            builder: (_, _) => const ShopDiscountsScreen(
              token: 'pula://shop/test-token-123456789',
            ),
          ),
          GoRoute(path: '/login', builder: (_, _) => const AuthScreen()),
          GoRoute(
            path: '/offers/spade-shovel',
            builder: (_, _) => const Scaffold(body: Text('Chosen shop item')),
          ),
        ],
      );
      addTearDown(container.dispose);
      addTearDown(router.dispose);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      await tester.pumpAndSettle();
      expect(api.codes, ['pula://shop/test-token-123456789']);
      expect(find.text('Central branch'), findsOneWidget);
      await tester.ensureVisible(find.text('Spade / Shovel'));
      await tester.drag(find.byType(ListView).first, const Offset(0, -300));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Spade / Shovel'));
      await tester.pumpAndSettle();
      expect(container.read(pendingShopOfferProvider), '/offers/spade-shovel');
      await tester.enterText(
        find.byType(TextFormField).at(0),
        'review@example.test',
      );
      await tester.enterText(
        find.byType(TextFormField).at(1),
        'sample-password-123',
      );
      await tester.ensureVisible(find.widgetWithText(FilledButton, 'Sign in'));
      await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
      await tester.pumpAndSettle();
      expect(find.text('Chosen shop item'), findsOneWidget);
      expect(container.read(pendingShopOfferProvider), isNull);
    },
  );
  for (final unavailable in [false, true]) {
    testWidgets(
      unavailable
          ? 'revoked code shows a recoverable error'
          : 'shop with no published items has an honest empty state',
      (tester) async {
        final api = ShopApi()
          ..empty = true
          ..unavailable = unavailable;
        await tester.pumpWidget(
          ProviderScope(
            overrides: [apiProvider.overrideWithValue(api)],
            child: const MaterialApp(
              home: ShopDiscountsScreen(token: 'test-token-123456789'),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(
          find.textContaining(
            unavailable
                ? 'This shop code is unavailable.'
                : 'There are no published discounted items',
          ),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);
      },
    );
  }
}
