import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_application_1/core/api.dart';
import 'package:flutter_application_1/features/merchants/screens.dart';
import 'package:flutter_application_1/features/transactions/screens.dart';
import 'package:flutter_application_1/features/profile/screen.dart';

class FixtureApi extends Api {
  @override
  Future<dynamic> get(String path) async {
    if (path.startsWith('/shops/')) {
      return {
        'id': 'shop',
        'name': 'Fictional shop',
        'address': 'Fictional road',
        'merchant': {'description': 'Fictional business'},
        'offers': <dynamic>[],
      };
    }
    if (path.startsWith('/transactions/')) {
      return {
        'id': 'purchase',
        'shop': {'name': 'Fictional shop'},
        'status': 'NEEDS_REVIEW',
        'amount': '123.45',
        'createdAt': '2026-10-13T12:00:00Z',
        'history': <dynamic>[],
      };
    }
    return <dynamic>[];
  }
}

void main() {
  for (final entry in <String, Widget>{
    'discovery': const HomeScreen(),
    'shop': const ShopScreen(id: 'shop'),
    'history': const HistoryScreen(),
    'purchase': const TransactionScreen(id: 'purchase'),
    'notifications': const NotificationsScreen(),
  }.entries) {
    testWidgets(
      '${entry.key} completes asynchronous loading without a setState Future error',
      (tester) async {
        await tester.pumpWidget(
          ProviderScope(
            overrides: [apiProvider.overrideWithValue(FixtureApi())],
            child: MaterialApp(home: entry.value),
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(find.byType(CircularProgressIndicator), findsNothing);
      },
    );
  }
}
