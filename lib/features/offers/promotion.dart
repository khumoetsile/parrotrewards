import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../auth/state.dart';

final promoProvider =
    StateNotifierProvider<PromoSession, Map<String, dynamic>?>(
      (ref) => PromoSession(ref.read(apiProvider)),
    );

class PromoSession extends StateNotifier<Map<String, dynamic>?> {
  final Api api;
  PromoSession(this.api) : super(null);
  Future<void> restore() async {
    final saved = await api.storage.read(key: 'pendingPromo');
    if (saved != null) {
      try {
        state = Map<String, dynamic>.from(jsonDecode(saved));
      } catch (_) {
        await clear();
      }
    }
  }

  Future<void> resolve(String slug, String? ref) async {
    final value = Map<String, dynamic>.from(
      await api.get(
        '/campaigns/$slug${ref != null ? '?ref=${Uri.encodeQueryComponent(ref)}' : ''}',
      ),
    );
    state = {
      'campaignSlug': value['slug'],
      if (value['referralCode'] != null) 'referralCode': value['referralCode'],
      if (value['offer'] != null) 'offerSlug': value['offer']['slug'],
    };
    await api.storage.write(key: 'pendingPromo', value: jsonEncode(state));
  }

  Future<String> destinationAfterAuth() async {
    if (state == null) await restore();
    if (state != null) {
      try {
        await api.post('/attribution', claimAttribution);
        return state!['offerSlug'] != null
            ? '/offers/${state!['offerSlug']}'
            : '/home';
      } catch (_) {
        await clear();
      }
    }
    return '/home';
  }

  Map<String, dynamic> get claimAttribution => state == null
      ? {}
      : {
          'campaignSlug': state!['campaignSlug'],
          if (state!['referralCode'] != null)
            'referralCode': state!['referralCode'],
        };
  Map<String, dynamic> attributionFor(String offerSlug) =>
      state?['offerSlug'] == null || state?['offerSlug'] == offerSlug
      ? claimAttribution
      : {};
  Future<void> clear() async {
    state = null;
    await api.storage.delete(key: 'pendingPromo');
  }
}

class PromotionEntryScreen extends ConsumerStatefulWidget {
  final String slug;
  final String? referral;
  const PromotionEntryScreen({super.key, required this.slug, this.referral});
  @override
  ConsumerState<PromotionEntryScreen> createState() => _EntryState();
}

class _EntryState extends ConsumerState<PromotionEntryScreen> {
  String? error;
  @override
  void initState() {
    super.initState();
    Future.microtask(open);
  }

  Future<void> open() async {
    if (mounted) setState(() => error = null);
    try {
      await ref
          .read(promoProvider.notifier)
          .resolve(widget.slug, widget.referral);
      var signedIn = ref.read(sessionProvider) != null;
      if (!signedIn) {
        signedIn = await ref.read(sessionProvider.notifier).restore();
      }
      if (!mounted) return;
      if (signedIn) {
        final destination = await ref
            .read(promoProvider.notifier)
            .destinationAfterAuth();
        if (mounted) context.go(destination);
      } else {
        context.go('/register');
      }
    } catch (e) {
      if (mounted) setState(() => error = errorMessage(e));
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Parrot Rewards')),
    body: Center(
      child: error == null
          ? const Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 20),
                Text('Opening your promotion…'),
              ],
            )
          : Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(error!, textAlign: TextAlign.center),
                  TextButton(onPressed: open, child: const Text('Try again')),
                  TextButton(
                    onPressed: () => context.go('/welcome'),
                    child: const Text('Discover Parrot Rewards'),
                  ),
                ],
              ),
            ),
    ),
  );
}
