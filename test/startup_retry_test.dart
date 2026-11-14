import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_application_1/core/api.dart';
import 'package:flutter_application_1/features/auth/screens.dart';

class RecoveringApi extends Api {
  int requests = 0;
  @override
  Future<dynamic> get(String path) async {
    if (requests++ == 0) {
      throw DioException(
        requestOptions: RequestOptions(path: path),
        type: DioExceptionType.connectionTimeout,
      );
    }
    return {'name': 'Customer', 'role': 'CUSTOMER'};
  }
}

void main() {
  testWidgets(
    'startup offers retry after a timeout and restores without another sign-in',
    (tester) async {
      FlutterSecureStorage.setMockInitialValues({
        'accessToken': 'test-access',
        'refreshToken': 'test-refresh',
      });
      final api = RecoveringApi();
      final router = GoRouter(
        routes: [
          GoRoute(path: '/', builder: (_, _) => const SplashScreen()),
          GoRoute(
            path: '/home',
            builder: (_, _) => const Scaffold(body: Text('Restored account')),
          ),
        ],
      );
      addTearDown(router.dispose);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [apiProvider.overrideWithValue(api)],
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      await tester.pumpAndSettle();
      expect(
        find.text('The connection took too long. Please try again.'),
        findsOneWidget,
      );
      expect(await api.storage.read(key: 'refreshToken'), 'test-refresh');
      await tester.tap(find.text('Try again'));
      await tester.pumpAndSettle();
      expect(find.text('Restored account'), findsOneWidget);
      expect(api.requests, 2);
    },
  );
}
