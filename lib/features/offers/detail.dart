import '../../core/navigation.dart';

import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/widgets.dart';
import 'models.dart';
import 'widgets.dart';
import 'promotion.dart';

class OfferDetailScreen extends ConsumerStatefulWidget {
  final String slug;
  const OfferDetailScreen({super.key, required this.slug});
  @override
  ConsumerState<OfferDetailScreen> createState() => _DetailState();
}

class _DetailState extends ConsumerState<OfferDetailScreen> {
  late Future<dynamic> offer;
  bool busy = false;
  final submissionKey = List.generate(
    24,
    (_) => Random.secure().nextInt(256).toRadixString(16).padLeft(2, '0'),
  ).join();
  @override
  void initState() {
    super.initState();
    load();
  }

  void load() {
    setState(() {
      offer = ref.read(apiProvider).get('/offers/${widget.slug}');
    });
  }

  Future<void> claim(PromotionOffer item) async {
    if (busy) return;
    setState(() => busy = true);
    try {
      final result = await ref.read(apiProvider).post('/claims', {
        'offerId': item.id,
        'idempotencyKey': submissionKey,
        ...ref.read(promoProvider.notifier).attributionFor(item.slug),
      });
      if (mounted) context.go('/claims/${result['id']}');
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Offer details'),
      leading: IconButton(
        tooltip: 'Back',
        icon: const Icon(Icons.arrow_back),
        onPressed: () => goBack(context, '/home'),
      ),
    ),
    body: AsyncContent(
      future: offer,
      retry: load,
      builder: (json) {
        final item = PromotionOffer.fromJson(Map<String, dynamic>.from(json));
        return Scaffold(
          body: ListView(
            children: [
              OfferArt(item.imageKey, isSample: item.isDemo),
              Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.category.toUpperCase(),
                      style: TextStyle(
                        color: categoryColor(item.imageKey),
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      item.title,
                      style: Theme.of(context).textTheme.headlineLarge
                          ?.copyWith(fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 16),
                    OfferPrices(
                      originalPrice: item.originalPrice,
                      discountedPrice: item.price,
                    ),
                    if (item.savings != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          'Save BWP ${displayPrice(item.savings!)} · ${item.discountPercent}% discount',
                          style: const TextStyle(
                            color: Color(0xff15724b),
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                          ),
                        ),
                      ),
                    const SizedBox(height: 22),
                    Text(
                      item.description,
                      style: const TextStyle(height: 1.6, fontSize: 16),
                    ),
                    const SizedBox(height: 22),
                    if (item.isDemo)
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xfff2edda),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Text(
                          'Sample offer · Provider participation and availability are not confirmed. A discount claim is not proof of payment or an admission ticket.',
                          style: TextStyle(height: 1.5),
                        ),
                      ),
                    const SizedBox(height: 22),
                    Text(
                      'How to redeem',
                      style: Theme.of(context).textTheme.titleLarge
                          ?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      '1. Save your unique discount claim.\n2. Present its reference to the provider.\n3. The provider validates it under the agreed process.',
                      style: TextStyle(height: 1.8),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      'Terms & conditions',
                      style: Theme.of(context).textTheme.titleMedium
                          ?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      customerTerms(item.terms),
                      style: const TextStyle(
                        height: 1.6,
                        color: Color(0xff5d7063),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'Claim limit: ${json['perUserClaimLimit']} per customer. ${json['claimTtlHours'] == null ? (json['expiresAt'] == null ? 'No claim expiry configured.' : 'Expires with the offer: ${json['expiresAt']}') : 'Valid for up to ${json['claimTtlHours']} hours, or until the offer expires.'}',
                      style: const TextStyle(fontSize: 12),
                    ),
                    const SizedBox(height: 24),
                    TextButton(
                      onPressed: () => context.go('/claims'),
                      child: const Text('View My Claims'),
                    ),
                  ],
                ),
              ),
            ],
          ),
          bottomNavigationBar: SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'A claim is not payment or an admission ticket.',
                    style: TextStyle(fontSize: 11, color: Color(0xff5d7063)),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: busy ? null : () => claim(item),
                      icon: const Icon(Icons.confirmation_number_outlined),
                      label: Text(busy ? 'Saving claim…' : item.action),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    ),
  );
}
