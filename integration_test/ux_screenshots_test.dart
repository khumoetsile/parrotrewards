import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:flutter_application_1/core/api.dart';
import 'package:flutter_application_1/core/routing.dart';
import 'package:flutter_application_1/features/auth/state.dart';
import 'package:flutter_application_1/main.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('running Android read-only UX review with existing session', (
    tester,
  ) async {
    final api = Api();
    final container = ProviderContainer(
      overrides: [
        apiProvider.overrideWithValue(api),
        launchRouteProvider.overrideWithValue('/home'),
      ],
    );
    addTearDown(container.dispose);
    final restored = await container.read(sessionProvider.notifier).restore();
    if (!restored) {
      const encoded = String.fromEnvironment('QA_PASSWORD_B64');
      final password = encoded.isEmpty
          ? ''
          : utf8.decode(base64Decode(encoded));
      expect(
        password,
        isNotEmpty,
        reason: 'Existing customer session or local QA credentials required.',
      );
      await container
          .read(sessionProvider.notifier)
          .login('customer@example.test', password);
    }
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const ParrotRewardsApp(),
      ),
    );
    Future<void> settle() async {
      for (var i = 0; i < 20; i++) {
        await tester.pump(const Duration(milliseconds: 250));
      }
    }

    await settle();
    await binding.convertFlutterSurfaceToImage();
    await tester.pump();
    Future<void> shot(String name) async {
      await settle();
      await binding.takeScreenshot(name);
    }

    await shot('home-after-audit');
    final router = container.read(routerProvider);
    final offers = await tester.runAsync(() => api.get('/offers')) as List;
    expect(offers, isNotEmpty);
    router.push('/offers/${offers.first['slug']}');
    await shot('offer-after-audit');
    expect(find.byType(NavigationBar), findsOneWidget);
    router.pop();
    await settle();
    router.go('/claims');
    await shot('claims-after-audit');
    final claims = await tester.runAsync(() => api.get('/claims')) as List;
    if (claims.isNotEmpty) {
      router.push('/claims/${claims.first['id']}');
      await shot('claim-detail-after-audit');
      router.pop();
    }
    router.go('/notifications');
    await shot('updates-after-audit');
    router.go('/profile');
    await shot('account-after-audit');
    router.go('/login');
    await shot('login-after-audit');
    router.go('/forgot');
    await shot('recovery-after-audit');
    router.go('/home');
    await settle();
  });
}
