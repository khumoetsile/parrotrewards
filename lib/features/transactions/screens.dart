import '../../core/search.dart';

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/widgets.dart';

class HistoryScreen extends ConsumerStatefulWidget {
  const HistoryScreen({super.key});
  @override
  ConsumerState<HistoryScreen> createState() => _HistoryState();
}

class _HistoryState extends ConsumerState<HistoryScreen> {
  late Future<dynamic> history;
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

  void load() => setState(() {
    history = ref
        .read(apiProvider)
        .get(
          '/transactions?page=$page&search=${Uri.encodeQueryComponent(search.text.trim())}${status.isEmpty ? '' : '&status=$status'}',
        );
  });
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Your purchases')),
    body: Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              LiveSearchField(
                controller: search,
                hint: 'Search shop or purchase reference',
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
                  ...[
                    'SUBMITTED',
                    'PROCESSING',
                    'NEEDS_REVIEW',
                    'VERIFIED',
                    'REJECTED',
                    'CANCELLED',
                  ].map(
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
            future: history,
            retry: load,
            builder: (data) => RefreshIndicator(
              onRefresh: () async {
                load();
                await history;
              },
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  const Text(
                    'Recorded purchases and their verification status.',
                  ),
                  const SizedBox(height: 16),
                  if ((data as List).isEmpty)
                    Padding(
                      padding: const EdgeInsets.all(36),
                      child: Text(
                        search.text.isNotEmpty || status.isNotEmpty
                            ? 'No matching purchases. Try another search or status.'
                            : 'Your purchases will appear here after you scan a shop QR and submit a receipt.',
                      ),
                    ),
                  ...data.map(
                    (t) => Card(
                      child: ListTile(
                        title: Text(t['shop']['name']),
                        subtitle: Text(
                          'BWP ${t['amount']}\n${t['createdAt'].toString().substring(0, 10)}',
                        ),
                        isThreeLine: true,
                        trailing: StatusBadge(t['status']),
                        onTap: () => context.push('/transactions/${t['id']}'),
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

class TransactionScreen extends ConsumerStatefulWidget {
  final String id;
  const TransactionScreen({super.key, required this.id});
  @override
  ConsumerState<TransactionScreen> createState() => _TransactionState();
}

class _TransactionState extends ConsumerState<TransactionScreen> {
  late Future<dynamic> purchase;
  Timer? timer;
  @override
  void initState() {
    super.initState();
    load();
    timer = Timer.periodic(const Duration(seconds: 8), (_) {
      if (mounted) load();
    });
  }

  void load() => setState(() {
    purchase = ref.read(apiProvider).get('/transactions/${widget.id}');
  });
  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Purchase details'),
      actions: [
        IconButton(
          tooltip: 'Refresh',
          onPressed: load,
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: AsyncContent(
      future: purchase,
      retry: load,
      builder: (t) {
        if (!['SUBMITTED', 'PROCESSING'].contains(t['status'])) timer?.cancel();
        return ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text(
              t['shop']['name'],
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 14),
            Text(
              'BWP ${t['amount']}',
              style: Theme.of(context).textTheme.headlineLarge,
            ),
            Align(
              alignment: Alignment.centerLeft,
              child: StatusBadge(t['status']),
            ),
            const SizedBox(height: 20),
            Text(
              t['status'] == 'VERIFIED'
                  ? 'Your purchase has been reviewed and verified.'
                  : t['status'] == 'NEEDS_REVIEW'
                  ? 'Your receipt needs independent review. We’ll update you when it is complete.'
                  : 'Your purchase is recorded. Receipt verification is separate from submission.',
            ),
            const SizedBox(height: 20),
            SelectableText('Reference: ${t['id']}'),
            Text('Submitted: ${t['createdAt']}'),
            const SizedBox(height: 22),
            Text(
              'Status history',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            ...(t['history'] as List).map(
              (h) => ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.check_circle_outline),
                title: Text(h['status'].toString().replaceAll('_', ' ')),
                subtitle: Text(h['reason']),
              ),
            ),
            if (t['status'] == 'SUBMITTED')
              OutlinedButton(
                onPressed: () async {
                  try {
                    await ref
                        .read(apiProvider)
                        .post('/transactions/${widget.id}/cancel', {});
                    load();
                  } catch (e) {
                    if (context.mounted) showError(context, e);
                  }
                },
                child: const Text('Cancel before processing'),
              ),
          ],
        );
      },
    ),
  );
}
