import '../../core/navigation.dart';
import '../../core/search.dart';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/widgets.dart';
import '../offers/models.dart';

class ClaimsScreen extends ConsumerStatefulWidget {
  const ClaimsScreen({super.key});
  @override
  ConsumerState<ClaimsScreen> createState() => _ClaimsState();
}

class _ClaimsState extends ConsumerState<ClaimsScreen> {
  late Future<dynamic> claims;
  int page = 1;
  final search = TextEditingController();
  String status = '';
  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    load();
  }

  void load() {
    setState(() {
      claims = ref
          .read(apiProvider)
          .get(
            '/claims?page=$page&search=${Uri.encodeQueryComponent(search.text.trim())}${status.isEmpty ? '' : '&status=$status'}',
          );
    });
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('My Claims')),
    body: Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              LiveSearchField(
                controller: search,
                hint: 'Search offer or claim reference',
                onSearch: () {
                  page = 1;
                  load();
                },
              ),
              SearchableChoice(
                label: 'Filter status',
                value: status,
                options: [
                  const ChoiceOption('', 'All statuses'),
                  ...['CLAIMED', 'REDEEMED', 'EXPIRED', 'CANCELLED'].map(
                    (s) =>
                        ChoiceOption(s, s.replaceAll('_', ' ').toLowerCase()),
                  ),
                ],
                onChanged: (value) {
                  status = value;
                  page = 1;
                  load();
                },
              ),
            ],
          ),
        ),
        Expanded(
          child: AsyncContent(
            future: claims,
            retry: load,
            builder: (data) => RefreshIndicator(
              onRefresh: () async {
                load();
                await claims;
              },
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  const Text(
                    'Your saved discounts, ready for provider validation.',
                  ),
                  const SizedBox(height: 16),
                  if ((data as List).isEmpty)
                    Padding(
                      padding: const EdgeInsets.all(30),
                      child: Column(
                        children: [
                          const Icon(
                            Icons.confirmation_number_outlined,
                            size: 60,
                            color: Color(0xff15724b),
                          ),
                          const SizedBox(height: 14),
                          Text(
                            search.text.isNotEmpty || status.isNotEmpty
                                ? 'No matching claims. Try another search or status.'
                                : 'No claims yet. Find an offer you love.',
                          ),
                          TextButton(
                            onPressed: () => context.go('/home'),
                            child: const Text('Discover offers'),
                          ),
                        ],
                      ),
                    ),
                  ...data.map(
                    (c) => Card(
                      child: ListTile(
                        contentPadding: const EdgeInsets.all(16),
                        title: Text(
                          c['titleSnapshot'],
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        subtitle: Text(
                          'BWP ${displayPrice(c['discountedPrice'])}\n${c['isDemo'] ? 'Sample offer · ' : ''}${friendlyStatus(c['status'])}',
                        ),
                        isThreeLine: true,
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => context.push('/claims/${c['id']}'),
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
                        onPressed: data.length == 20
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
          ),
        ),
      ],
    ),
  );
}

class ClaimDetailScreen extends ConsumerStatefulWidget {
  final String id;
  const ClaimDetailScreen({super.key, required this.id});
  @override
  ConsumerState<ClaimDetailScreen> createState() => _ClaimDetailState();
}

class _ClaimDetailState extends ConsumerState<ClaimDetailScreen> {
  late Future<dynamic> claim;
  bool busy = false;
  @override
  void initState() {
    super.initState();
    load();
  }

  void load() {
    setState(() {
      claim = ref.read(apiProvider).get('/claims/${widget.id}');
    });
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Your discount claim'),
      leading: IconButton(
        tooltip: 'Back',
        onPressed: () => goBack(context, '/claims'),
        icon: const Icon(Icons.arrow_back),
      ),
      actions: [
        IconButton(
          tooltip: 'Refresh claim status',
          onPressed: load,
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: AsyncContent(
      future: claim,
      retry: load,
      builder: (c) => ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Icon(
            c['status'] == 'CLAIMED'
                ? Icons.check_circle
                : Icons.confirmation_number_outlined,
            size: 60,
            color: const Color(0xff15724b),
          ),
          const SizedBox(height: 20),
          Text(
            c['titleSnapshot'],
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineMedium
                ?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          Text(
            'BWP ${displayPrice(c['discountedPrice'])}',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
          ),
          Center(child: StatusBadge(c['status'])),
          const SizedBox(height: 20),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  const Text(
                    'UNIQUE CLAIM REFERENCE',
                    style: TextStyle(
                      letterSpacing: 1,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  SelectableText(
                    c['reference'],
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () async {
                      await Clipboard.setData(
                        ClipboardData(text: c['reference']),
                      );
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Reference copied.')),
                        );
                      }
                    },
                    icon: const Icon(Icons.copy, size: 17),
                    label: const Text('Copy reference'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Present this reference to the provider for validation. It is not proof of payment or an admission ticket.',
            style: TextStyle(height: 1.6),
          ),
          if (c['isDemo'])
            const Padding(
              padding: EdgeInsets.only(top: 14),
              child: Text(
                'Sample offer · Provider participation and availability are not confirmed.',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Color(0xff8c621c),
                ),
              ),
            ),
          const SizedBox(height: 20),
          Text('Created: ${friendlyDate(context, c['createdAt'])}'),
          Text(
            c['expiresAt'] == null
                ? 'No expiry date'
                : 'Expires: ${friendlyDate(context, c['expiresAt'])}',
          ),
          if (c['redemption'] != null)
            Text(
              'Validated by provider: ${friendlyDate(context, c['redemption']['createdAt'])}',
            ),
          const SizedBox(height: 20),
          Text(
            customerTerms(c['termsSnapshot']),
            style: const TextStyle(height: 1.6, color: Color(0xff5d7063)),
          ),
          const SizedBox(height: 20),
          if (c['status'] == 'CLAIMED')
            OutlinedButton(
              onPressed: busy
                  ? null
                  : () async {
                      final confirmed = await showDialog<bool>(
                        context: context,
                        builder: (dialogContext) => AlertDialog(
                          title: const Text('Cancel this claim?'),
                          content: const Text(
                            'This reference will stop working. A cancelled claim still counts towards the offer’s claim limit, so you may not be able to claim this offer again.',
                          ),
                          actions: [
                            TextButton(
                              onPressed: () =>
                                  Navigator.pop(dialogContext, false),
                              child: const Text('Keep claim'),
                            ),
                            FilledButton(
                              onPressed: () =>
                                  Navigator.pop(dialogContext, true),
                              child: const Text('Cancel claim'),
                            ),
                          ],
                        ),
                      );
                      if (confirmed != true || !mounted) return;
                      setState(() => busy = true);
                      try {
                        await ref
                            .read(apiProvider)
                            .post('/claims/${widget.id}/cancel', {});
                        load();
                      } catch (e) {
                        if (context.mounted) showError(context, e);
                      } finally {
                        if (mounted) setState(() => busy = false);
                      }
                    },
              child: const Text('Cancel claim'),
            ),
          FilledButton(
            onPressed: () => context.go('/home'),
            child: const Text('Discover more offers'),
          ),
        ],
      ),
    ),
  );
}
