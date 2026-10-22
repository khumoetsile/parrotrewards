import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/routing.dart';
import 'core/theme.dart';

void main() => runApp(const ProviderScope(child: ParrotRewardsApp()));

class ParrotRewardsApp extends ConsumerWidget {
  const ParrotRewardsApp({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) => MaterialApp.router(
    title: 'Parrot Rewards',
    debugShowCheckedModeBanner: false,
    theme: parrotRewardsTheme,
    routerConfig: ref.watch(routerProvider),
  );
}
