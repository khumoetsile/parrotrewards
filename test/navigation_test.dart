import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_application_1/core/navigation.dart';

void main() {
  testWidgets('native back and tab switches retain discovery state', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(390, 844);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
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
                  builder: (context, _) => Scaffold(
                    appBar: AppBar(title: const Text('Home')),
                    body: Column(
                      children: [
                        const TextField(),
                        TextButton(
                          onPressed: () => context.push('/offer'),
                          child: const Text('Open offer'),
                        ),
                      ],
                    ),
                  ),
                ),
                GoRoute(
                  path: '/offer',
                  builder: (_, _) => Scaffold(
                    appBar: AppBar(title: const Text('Offer')),
                    body: const Text('Details'),
                  ),
                ),
              ],
            ),
            for (final path in ['/claims', '/notifications', '/profile'])
              StatefulShellBranch(
                routes: [
                  GoRoute(
                    path: path,
                    builder: (_, _) => Scaffold(body: Text('Page $path')),
                  ),
                ],
              ),
          ],
        ),
      ],
    );
    addTearDown(router.dispose);
    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    await tester.enterText(find.byType(TextField), 'hardware');
    await tester.tap(find.text('Open offer'));
    await tester.pumpAndSettle();
    expect(find.text('Details'), findsOneWidget);
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.text('Discover').hitTestable(), findsOneWidget);
    expect(find.byTooltip('Forward'), findsNothing);
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.text('hardware'), findsOneWidget);
    await tester.tap(
      find.descendant(
        of: find.byType(NavigationBar),
        matching: find.text('My Claims'),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Page /claims'), findsOneWidget);
    await tester.tap(find.text('Discover'));
    await tester.pumpAndSettle();
    expect(find.text('hardware'), findsOneWidget);
    expect(find.byType(NavigationBar), findsOneWidget);
    tester.view.physicalSize = const Size(1024, 900);
    await tester.pumpAndSettle();
    expect(find.byType(NavigationRail), findsOneWidget);
    expect(find.text('hardware'), findsOneWidget);
    tester.view.physicalSize = const Size(1440, 900);
    await tester.pumpAndSettle();
    expect(
      tester.widget<NavigationRail>(find.byType(NavigationRail)).extended,
      isTrue,
    );
    expect(tester.takeException(), isNull);
  });
}
