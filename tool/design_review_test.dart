// Manual design review: renders actual Flutter widgets with fictional fixture data.
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_application_1/core/api.dart';
import 'package:flutter_application_1/core/navigation.dart';
import 'package:flutter_application_1/core/theme.dart';
import 'package:flutter_application_1/features/offers/discovery.dart';

class ReviewApi extends Api {
  @override
  Future<dynamic> get(String path) async {
    if (path == '/categories') {
      return [
        {'name': 'Hardware', 'slug': 'hardware'},
        {'name': 'Music', 'slug': 'music'},
      ];
    }
    return [
      {
        'id': 'review',
        'slug': 'garden-weekend',
        'title': 'Weekend garden essentials',
        'description': 'Fictional visual review fixture',
        'category': {'name': 'Hardware', 'slug': 'hardware'},
        'merchant': {'name': 'Sample Garden Store'},
        'imageKey': 'hardware',
        'terms': 'Sample conditions for visual review only.',
        'claimAction': 'Claim Discount',
        'discountedPrice': '100.00',
        'originalPrice': '200.00',
        'savings': '100.00',
        'discountPercent': 50,
        'isDemo': true,
      },
    ];
  }
}

void main() {
  testWidgets('manual mobile design review at phone size', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final root =
        Platform.environment['FLUTTER_ROOT'] ?? 'C:/FlutterSDK/flutter';
    await tester.runAsync(() async {
      final loader = FontLoader('Roboto');
      for (final weight in ['regular', 'bold', 'black']) {
        final bytes = File(
          '$root/bin/cache/artifacts/material_fonts/roboto-$weight.ttf',
        ).readAsBytesSync();
        loader.addFont(Future.value(ByteData.sublistView(bytes)));
      }
      await loader.load();
      final icons = FontLoader('MaterialIcons')
        ..addFont(
          Future.value(
            ByteData.sublistView(
              File(
                '$root/bin/cache/artifacts/material_fonts/materialicons-regular.otf',
              ).readAsBytesSync(),
            ),
          ),
        );
      await icons.load();
    });
    final router = GoRouter(
      initialLocation: '/home',
      routes: [
        StatefulShellRoute.indexedStack(
          builder: (_, _, shell) => AppNavigation(navigationShell: shell),
          branches: [
            StatefulShellBranch(
              routes: [
                GoRoute(
                  path: '/home',
                  builder: (_, _) => const DiscoverOffersScreen(),
                ),
              ],
            ),
            for (final path in ['/claims', '/notifications', '/profile'])
              StatefulShellBranch(
                routes: [
                  GoRoute(path: path, builder: (_, _) => const Scaffold()),
                ],
              ),
          ],
        ),
      ],
    );
    addTearDown(router.dispose);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiProvider.overrideWithValue(ReviewApi())],
        child: MaterialApp.router(
          theme: parrotRewardsTheme.copyWith(
            filledButtonTheme: FilledButtonThemeData(
              style: parrotRewardsTheme.filledButtonTheme.style?.copyWith(
                textStyle: const WidgetStatePropertyAll(
                  TextStyle(
                    fontFamily: 'Roboto',
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
            outlinedButtonTheme: OutlinedButtonThemeData(
              style: parrotRewardsTheme.outlinedButtonTheme.style?.copyWith(
                textStyle: const WidgetStatePropertyAll(
                  TextStyle(
                    fontFamily: 'Roboto',
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
            chipTheme: parrotRewardsTheme.chipTheme.copyWith(
              labelStyle: parrotRewardsTheme.chipTheme.labelStyle?.copyWith(
                fontFamily: 'Roboto',
              ),
            ),
            textButtonTheme: TextButtonThemeData(
              style: TextButton.styleFrom(
                textStyle: const TextStyle(fontFamily: 'Roboto'),
              ),
            ),
            textTheme: parrotRewardsTheme.textTheme.apply(fontFamily: 'Roboto'),
            primaryTextTheme: parrotRewardsTheme.primaryTextTheme.apply(
              fontFamily: 'Roboto',
            ),
            appBarTheme: parrotRewardsTheme.appBarTheme.copyWith(
              titleTextStyle: parrotRewardsTheme.appBarTheme.titleTextStyle
                  ?.copyWith(fontFamily: 'Roboto'),
            ),
          ),
          routerConfig: router,
          debugShowCheckedModeBanner: false,
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    final directory = Platform.environment['PARROT_DESIGN_OUTPUT']!;
    await expectLater(
      find.byType(MaterialApp),
      matchesGoldenFile(Uri.file('$directory/Parrot-home-design.png')),
    );
    await tester.drag(find.byType(Scrollable).first, const Offset(0, -570));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await expectLater(
      find.byType(MaterialApp),
      matchesGoldenFile(Uri.file('$directory/Parrot-offer-design.png')),
    );
    tester.view.physicalSize = const Size(320, 720);
    tester.platformDispatcher.textScaleFactorTestValue = 1.5;
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });
}
