import 'navigation.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/screens.dart';
import '../features/auth/state.dart';
import '../features/merchants/screens.dart';
import '../features/transactions/screens.dart';
import '../features/receipts/capture.dart';
import '../features/profile/screen.dart';
import '../features/offers/discovery.dart';
import '../features/offers/detail.dart';
import '../features/offers/promotion.dart';
import '../features/claims/screens.dart';

final launchRouteProvider = Provider<String>((ref) => '/');
final routerProvider = Provider<GoRouter>((ref) {
  final router = GoRouter(
    initialLocation: ref.read(launchRouteProvider),
    redirect: (context, state) {
      if (state.uri.scheme == 'parrotrewards' && state.uri.host == 'promo') {
        return '/promo${state.uri.path}${state.uri.hasQuery ? '?${state.uri.query}' : ''}';
      }
      if (state.uri.path.startsWith('/promo/') ||
          state.uri.path.startsWith('/p/')) {
        return null;
      }
      const publicPaths = ['/', '/welcome', '/login', '/register', '/forgot'];
      if (!publicPaths.contains(state.uri.path) &&
          ref.read(sessionProvider) == null) {
        return '/login';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (_, _) => const SplashScreen()),
      GoRoute(path: '/welcome', builder: (_, _) => const WelcomeScreen()),
      GoRoute(path: '/login', builder: (_, _) => const AuthScreen()),
      GoRoute(
        path: '/register',
        builder: (_, _) => const AuthScreen(register: true),
      ),
      GoRoute(path: '/forgot', builder: (_, _) => const RecoveryScreen()),
      GoRoute(
        path: '/promo/:slug',
        builder: (_, state) => PromotionEntryScreen(
          slug: state.pathParameters['slug']!,
          referral: state.uri.queryParameters['ref'],
        ),
      ),
      GoRoute(
        path: '/p/:slug',
        builder: (_, state) => PromotionEntryScreen(
          slug: state.pathParameters['slug']!,
          referral: state.uri.queryParameters['ref'],
        ),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) =>
            AppNavigation(navigationShell: shell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/home',
                builder: (_, _) => const DiscoverOffersScreen(),
              ),
              GoRoute(
                path: '/offers/:slug',
                builder: (_, state) =>
                    OfferDetailScreen(slug: state.pathParameters['slug']!),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/claims', builder: (_, _) => const ClaimsScreen()),
              GoRoute(
                path: '/claims/:id',
                builder: (_, state) =>
                    ClaimDetailScreen(id: state.pathParameters['id']!),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/notifications',
                builder: (_, _) => const NotificationsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                onExit: (context, state) async {
                  if (!ref.read(profileDirtyProvider)) return true;
                  final leave = await confirmProfileExit(context);
                  if (leave) {
                    ref.read(profileResetProvider.notifier).state++;
                    ref.read(profileDirtyProvider.notifier).state = false;
                  }
                  return leave;
                },
                builder: (_, _) => const ProfileScreen(),
              ),
              GoRoute(
                path: '/receipt-home',
                builder: (_, _) => const HomeScreen(),
              ),
              GoRoute(
                path: '/shops/:id',
                builder: (_, state) =>
                    ShopScreen(id: state.pathParameters['id']!),
              ),
              GoRoute(
                path: '/capture',
                builder: (_, state) =>
                    CaptureScreen(shopId: state.uri.queryParameters['shopId']),
              ),
              GoRoute(
                path: '/transactions',
                builder: (_, _) => const HistoryScreen(),
              ),
              GoRoute(
                path: '/transactions/:id',
                builder: (_, state) =>
                    TransactionScreen(id: state.pathParameters['id']!),
              ),
            ],
          ),
        ],
      ),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
});
