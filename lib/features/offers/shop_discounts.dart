import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../auth/state.dart';
import '../receipts/capture.dart' show ScannerScreen;
import 'models.dart';
import 'widgets.dart';

// Preserve the chosen shop item while a visitor signs in or creates an account.
final pendingShopOfferProvider = StateProvider<String?>((ref) => null);

class ShopDiscountsScreen extends ConsumerStatefulWidget {
  final String? token;
  const ShopDiscountsScreen({super.key, this.token});
  @override
  ConsumerState<ShopDiscountsScreen> createState() => _ShopDiscountsState();
}

class _ShopDiscountsState extends ConsumerState<ShopDiscountsScreen> {
  final code = TextEditingController();
  Map<String, dynamic>? result;
  String? currentToken, error;
  bool busy = false;
  int page = 1;
  int requestVersion = 0;
  @override
  void initState() {
    super.initState();
    if (widget.token != null) Future.microtask(() => load(widget.token!));
  }

  @override
  void didUpdateWidget(covariant ShopDiscountsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.token == widget.token) return;
    requestVersion++;
    busy = false;
    result = null;
    error = null;
    currentToken = null;
    page = 1;
    code.clear();
    final token = widget.token;
    if (token != null) {
      Future.microtask(() {
        if (mounted && widget.token == token) load(token);
      });
    }
  }

  @override
  void dispose() {
    requestVersion++;
    code.dispose();
    super.dispose();
  }

  Future<void> load(String token, {int nextPage = 1}) async {
    if (busy || !mounted) return;
    if (token.trim().isEmpty) {
      setState(() => error = 'Scan a shop code or paste the text from its QR.');
      return;
    }
    final version = ++requestVersion;
    setState(() {
      busy = true;
      error = null;
      result = null;
      currentToken = token.trim();
    });
    try {
      final data = Map<String, dynamic>.from(
        await ref.read(apiProvider).post(
          '/shop-discounts/resolve?page=$nextPage',
          {'token': token.trim()},
        ),
      );
      if (mounted && version == requestVersion) {
        setState(() {
          result = data;
          currentToken = token.trim();
          page = nextPage;
        });
      }
    } catch (e) {
      if (mounted && version == requestVersion) {
        setState(() => error = errorMessage(e));
      }
    } finally {
      if (mounted && version == requestVersion) setState(() => busy = false);
    }
  }

  Future<void> scan() async {
    final token = await Navigator.of(context)
        .push<String>(MaterialPageRoute(builder: (_) => const ScannerScreen()));
    if (token != null && mounted) await load(token);
  }

  Future<void> open(PromotionOffer offer) async {
    if (busy) return;
    final version = requestVersion;
    if (ref.read(sessionProvider) == null) {
      setState(() => busy = true);
      try {
        await ref.read(sessionProvider.notifier).restore();
      } catch (e) {
        if (mounted && version == requestVersion) {
          setState(() => error = errorMessage(e));
        }
        return;
      } finally {
        if (mounted && version == requestVersion) setState(() => busy = false);
      }
    }
    if (!mounted || version != requestVersion) return;
    final destination = '/offers/${offer.slug}';
    if (ref.read(sessionProvider) == null) {
      ref.read(pendingShopOfferProvider.notifier).state = destination;
      context.push('/login');
    } else {
      context.push(destination);
    }
  }

  @override
  Widget build(BuildContext context) {
    final shop = result?['shop'];
    final offers = (result?['offers'] as List?) ?? [];
    return Scaffold(
      appBar: AppBar(title: const Text('Shop discounts')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            'Scan. Choose. Save.',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 8),
          const Text(
            'Scan the Parrot Rewards QR displayed at the shop to see its selected discounted items.',
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: busy ? null : scan,
            icon: const Icon(Icons.qr_code_scanner),
            label: const Text('Scan shop QR'),
          ),
          const SizedBox(height: 8),
          ExpansionTile(
            title: const Text('Have the QR text instead?'),
            children: [
              TextField(
                controller: code,
                maxLength: 300,
                decoration: const InputDecoration(labelText: 'Shop QR text'),
                onSubmitted: busy ? null : load,
              ),
              TextButton(
                onPressed: busy ? null : () => load(code.text),
                child: const Text('Show shop discounts'),
              ),
            ],
          ),
          if (busy)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: CircularProgressIndicator()),
            ),
          if (error != null) ...[
            Text(
              error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
              semanticsLabel: error,
            ),
            if (currentToken != null || widget.token != null)
              TextButton(
                onPressed: busy
                    ? null
                    : () => load(currentToken ?? widget.token!),
                child: const Text('Try again'),
              ),
          ],
          if (shop != null) ...[
            const SizedBox(height: 24),
            Text(
              shop['name'],
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            Text('${shop['merchant']['name']} · ${shop['address']}'),
            const SizedBox(height: 12),
            const Text(
              'Choose an item to read its price and conditions. Sign in to save a discount claim and present the reference at the shop.',
            ),
            const SizedBox(height: 18),
            if (offers.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Text(
                  'There are no published discounted items at this shop right now. Ask the shop for help or scan another shop.',
                ),
              ),
            LayoutBuilder(
              builder: (context, bounds) {
                final columns = bounds.maxWidth >= 1000
                    ? 3
                    : bounds.maxWidth >= 660
                    ? 2
                    : 1;
                final width = (bounds.maxWidth - 20 * (columns - 1)) / columns;
                return Wrap(
                  spacing: 20,
                  children: offers.map((json) {
                    final offer = PromotionOffer.fromJson(
                      Map<String, dynamic>.from(json),
                    );
                    return SizedBox(
                      width: width,
                      child: OfferCard(offer: offer, onTap: () => open(offer)),
                    );
                  }).toList(),
                );
              },
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                TextButton(
                  onPressed: page > 1 && !busy
                      ? () => load(currentToken!, nextPage: page - 1)
                      : null,
                  child: const Text('Previous'),
                ),
                Text('Page $page of ${result!['totalPages']}'),
                TextButton(
                  onPressed: page < result!['totalPages'] && !busy
                      ? () => load(currentToken!, nextPage: page + 1)
                      : null,
                  child: const Text('Next'),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
