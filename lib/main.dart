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
    builder: (context, child) => ColoredBox(
      color: const Color(0xffeaf0e8),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1440),
          child: child ?? const SizedBox.shrink(),
        ),
      ),
    ),
    routerConfig: ref.watch(routerProvider),
  );
}
