import 'package:flutter/material.dart';

import 'api.dart';

class AsyncContent extends StatelessWidget {
  final Future<dynamic> future;
  final Widget Function(dynamic) builder;
  final VoidCallback? retry;
  const AsyncContent({
    super.key,
    required this.future,
    required this.builder,
    this.retry,
  });
  @override
  Widget build(BuildContext context) => FutureBuilder<dynamic>(
    future: future,
    builder: (context, snapshot) {
      if (snapshot.connectionState != ConnectionState.done) {
        return const Center(child: CircularProgressIndicator());
      }
      if (snapshot.hasError) {
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.cloud_off_outlined, size: 48),
                const SizedBox(height: 16),
                Text(
                  errorMessage(snapshot.error!),
                  textAlign: TextAlign.center,
                ),
                if (retry != null)
                  TextButton(onPressed: retry, child: const Text('Try again')),
              ],
            ),
          ),
        );
      }
      return builder(snapshot.data);
    },
  );
}

class StatusBadge extends StatelessWidget {
  final String status;
  const StatusBadge(this.status, {super.key});
  @override
  Widget build(BuildContext context) => Chip(
    label: Text(friendlyStatus(status), style: const TextStyle(fontSize: 11)),
    avatar: Icon(
      ['VERIFIED', 'REDEEMED'].contains(status)
          ? Icons.check_circle_outline
          : Icons.schedule,
      size: 16,
    ),
  );
}

void showError(BuildContext context, Object error) =>
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(errorMessage(error))));

String friendlyStatus(String status) => switch (status) {
  'CLAIMED' => 'Ready to redeem',
  'REDEEMED' => 'Redeemed',
  'EXPIRED' => 'Expired',
  'CANCELLED' => 'Cancelled',
  _ => status.toLowerCase().replaceAll('_', ' '),
};

String friendlyDate(BuildContext context, dynamic value) {
  final date = DateTime.tryParse(value?.toString() ?? '')?.toLocal();
  if (date == null) return 'Not available';
  return MaterialLocalizations.of(context).formatFullDate(date);
}
