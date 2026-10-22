import '../../core/search.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/widgets.dart';
import '../auth/state.dart';
import 'models.dart';
import 'widgets.dart';

class DiscoverOffersScreen extends ConsumerStatefulWidget {
  const DiscoverOffersScreen({super.key});
  @override
  ConsumerState<DiscoverOffersScreen> createState() => _DiscoverState();
}

class _DiscoverState extends ConsumerState<DiscoverOffersScreen> {
  late Future<dynamic> offers;
  late Future<dynamic> categories;
  final search = TextEditingController();
  String category = '';
  int page = 1;
  @override
  void initState() {
    super.initState();
    categories = ref.read(apiProvider).get('/categories');
    load();
  }

  void load() {
    setState(() {
      offers = ref
          .read(apiProvider)
          .get(
            '/offers?page=$page&search=${Uri.encodeQueryComponent(search.text.trim())}${category.isEmpty ? '' : '&category=$category'}',
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
      title: const Row(
        children: [
          CircleAvatar(
            radius: 17,
            backgroundColor: Color(0xffe3edcc),
            child: Icon(Icons.flutter_dash, color: Color(0xff15724b), size: 25),
          ),
          SizedBox(width: 10),
          Flexible(
            child: Text(
              'Parrot Rewards',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
            ),
          ),
        ],
      ),
      actions: [
        IconButton(
          tooltip: 'Notifications',
          onPressed: () => context.push('/notifications'),
          icon: const Icon(Icons.notifications_none_rounded),
        ),
      ],
    ),
    body: RefreshIndicator(
      onRefresh: () async {
        load();
        await offers;
      },
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 25),
        children: [
          Text(
            'Hello, ${ref.watch(sessionProvider)?['name'] ?? 'there'}',
            style: const TextStyle(
              fontWeight: FontWeight.w600,
              color: Color(0xff63756a),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Discover offers',
            style: Theme.of(context).textTheme.headlineLarge?.copyWith(
              fontWeight: FontWeight.w900,
              height: 1.05,
              letterSpacing: -1.3,
            ),
          ),
          const SizedBox(height: 22),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xff143e2d), Color(0xff2e6242)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(24),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 10,
                  runSpacing: 8,
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(top: 14),
                      child: Text(
                        'Find an offer. Save your discount.',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: () => showModalBottomSheet(
                        context: context,
                        useSafeArea: true,
                        isScrollControlled: true,
                        builder: (context) => const Padding(
                          padding: EdgeInsets.fromLTRB(24, 8, 24, 28),
                          child: SingleChildScrollView(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'A good deal, in three steps',
                                  style: TextStyle(
                                    fontSize: 23,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                SizedBox(height: 16),
                                ListTile(
                                  leading: Icon(Icons.explore_outlined),
                                  title: Text('Find your offer'),
                                  subtitle: Text(
                                    'Check the provider, pricing and conditions.',
                                  ),
                                ),
                                ListTile(
                                  leading: Icon(
                                    Icons.confirmation_number_outlined,
                                  ),
                                  title: Text('Save your claim'),
                                  subtitle: Text(
                                    'Your reference stays in My Claims.',
                                  ),
                                ),
                                ListTile(
                                  leading: Icon(Icons.verified_outlined),
                                  title: Text('Redeem with the provider'),
                                  subtitle: Text(
                                    'Present the reference. The provider checks it and confirms redemption once.',
                                  ),
                                ),
                                SizedBox(height: 12),
                                Text(
                                  'A claim saves a discount. Payment and admission follow the provider’s conditions.',
                                  style: TextStyle(fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      child: const Text(
                        'How it works',
                        style: TextStyle(color: Color(0xffe6efdb)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 22),
          LiveSearchField(
            controller: search,
            hint: 'Search tickets, tools and more',
            onSearch: () {
              page = 1;
              load();
            },
          ),
          const SizedBox(height: 18),
          AsyncContent(
            future: categories,
            retry: () {
              setState(() {
                categories = ref.read(apiProvider).get('/categories');
              });
            },
            builder: (items) => Wrap(
              spacing: 8,
              runSpacing: 6,
              children: [
                SearchableChoice(
                  label: 'Find a category',
                  value: category,
                  options: [
                    const ChoiceOption('', 'All categories'),
                    ...items.map((c) => ChoiceOption(c['slug'], c['name'])),
                  ],
                  onChanged: (value) {
                    category = value;
                    page = 1;
                    load();
                  },
                ),
                ...(items as List)
                    .take(5)
                    .map(
                      (c) => ChoiceChip(
                        label: Text(c['name']),
                        selected: category == c['slug'],
                        onSelected: (_) {
                          category = c['slug'];
                          page = 1;
                          load();
                        },
                      ),
                    ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Featured offers',
            style: Theme.of(context).textTheme.titleLarge
                ?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 16),
          AsyncContent(
            future: offers,
            retry: load,
            builder: (items) => Column(
              children: [
                if ((items as List).isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(30),
                    child: Text(
                      'No offers match your search. Try another category.',
                    ),
                  ),
                ...items.map((json) {
                  final offer = PromotionOffer.fromJson(
                    Map<String, dynamic>.from(json),
                  );
                  return OfferCard(
                    offer: offer,
                    onTap: () => context.push('/offers/${offer.slug}'),
                  );
                }),
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
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            'Present your claim to the provider to redeem your discount. Check each offer’s conditions before claiming.',
            style: TextStyle(fontSize: 12, color: Color(0xff63756a)),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    ),
  );
}
