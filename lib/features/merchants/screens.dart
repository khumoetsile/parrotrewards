import '../../core/search.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/widgets.dart';
import '../auth/state.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});
  @override
  ConsumerState<HomeScreen> createState() => _HomeState();
}

class _HomeState extends ConsumerState<HomeScreen> {
  late Future<dynamic> shops;
  late Future<dynamic> categories;
  final search = TextEditingController();
  String category = '';
  int page = 1;
  @override
  void initState() {
    super.initState();
    categories = ref.read(apiProvider).get('/shop-categories');
    load();
  }

  void load() {
    setState(() {
      shops = ref
          .read(apiProvider)
          .get(
            '/shops?page=$page&search=${Uri.encodeQueryComponent(search.text.trim())}${category.isNotEmpty ? '&category=$category' : ''}',
          );
    });
  }

  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text(
        'Parrot Rewards',
        style: TextStyle(fontWeight: FontWeight.w800),
      ),
      actions: [
        IconButton(
          tooltip: 'Notifications',
          onPressed: () => context.push('/notifications'),
          icon: const Icon(Icons.notifications_outlined),
        ),
        IconButton(
          tooltip: 'Profile',
          onPressed: () => context.push('/profile'),
          icon: const Icon(Icons.person_outline),
        ),
      ],
    ),
    body: RefreshIndicator(
      onRefresh: () async {
        load();
        await shops;
      },
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            'Hello, ${ref.watch(sessionProvider)?['name'] ?? 'neighbour'}',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 12),
          Text(
            'Explore your\nlocal favourites.',
            style: Theme.of(context).textTheme.headlineLarge
                ?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 24),
          Card(
            color: const Color(0xff173f35),
            child: Padding(
              padding: const EdgeInsets.all(22),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Just shopped?',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Scan the shop QR and add your receipt. We’ll keep you updated on its review.',
                    style: TextStyle(color: Colors.white, height: 1.5),
                  ),
                  const SizedBox(height: 16),
                  FilledButton.tonal(
                    onPressed: () => context.push('/capture'),
                    child: const Text('Scan & record purchase'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 22),
          LiveSearchField(
            controller: search,
            hint: 'Search participating shops',
            onSearch: () {
              page = 1;
              load();
            },
          ),
          const SizedBox(height: 12),
          AsyncContent(
            future: categories,
            retry: () {
              setState(
                () =>
                    categories = ref.read(apiProvider).get('/shop-categories'),
              );
            },
            builder: (items) => SearchableChoice(
              label: 'Find a shop category',
              value: category,
              options: [
                const ChoiceOption('', 'All categories'),
                ...(items as List).map((c) => ChoiceOption(c as String, c)),
              ],
              onChanged: (value) {
                category = value;
                page = 1;
                load();
              },
            ),
          ),
          const SizedBox(height: 20),
          AsyncContent(
            future: shops,
            retry: load,
            builder: (data) {
              final items = data as List;
              return Column(
                children: [
                  if (items.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(28),
                      child: Text(
                        'No participating shops found. Try another search.',
                      ),
                    ),
                  ...items.map(
                    (shop) => Card(
                      child: ListTile(
                        contentPadding: const EdgeInsets.all(16),
                        leading: const CircleAvatar(
                          child: Icon(Icons.storefront),
                        ),
                        title: Text(shop['name']),
                        subtitle: Text(
                          '${shop['merchant']['category']} · ${shop['address']}',
                        ),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => context.push('/shops/${shop['id']}'),
                      ),
                    ),
                  ),
                  Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    spacing: 12,
                    runSpacing: 8,
                    children: [
                      TextButton(
                        onPressed: page > 1
                            ? () {
                                page--;
                                load();
                              }
                            : null,
                        child: const Text('Previous'),
                      ),
                      Text('Page $page'),
                      TextButton(
                        onPressed: items.length == 20
                            ? () {
                                page++;
                                load();
                              }
                            : null,
                        child: const Text('Next'),
                      ),
                    ],
                  ),
                ],
              );
            },
          ),
        ],
      ),
    ),
  );
}

class ShopScreen extends ConsumerStatefulWidget {
  final String id;
  const ShopScreen({super.key, required this.id});
  @override
  ConsumerState<ShopScreen> createState() => _ShopState();
}

class _ShopState extends ConsumerState<ShopScreen> {
  late Future<dynamic> shop;
  @override
  void initState() {
    super.initState();
    load();
  }

  void load() => setState(() {
    shop = ref.read(apiProvider).get('/shops/${widget.id}');
  });
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Shop details')),
    body: AsyncContent(
      future: shop,
      retry: load,
      builder: (s) => ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const Icon(Icons.storefront, size: 90, color: Color(0xff16755d)),
          const SizedBox(height: 24),
          Text(s['name'], style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 8),
          Text(s['address']),
          const SizedBox(height: 20),
          Text(s['merchant']['description']),
          const SizedBox(height: 28),
          Text(
            'Shop information',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          ...(s['offers'] as List).map(
            (offer) => Card(
              child: ListTile(
                title: Text(offer['title']),
                subtitle: Text(offer['description']),
              ),
            ),
          ),
          const SizedBox(height: 22),
          const Text(
            'Payments happen directly with this shop. Submission is separate from verification.',
          ),
          const SizedBox(height: 18),
          FilledButton.icon(
            onPressed: () => context.push('/capture?shopId=${widget.id}'),
            icon: const Icon(Icons.qr_code_scanner),
            label: const Text('Scan shop QR to record purchase'),
          ),
        ],
      ),
    ),
  );
}
