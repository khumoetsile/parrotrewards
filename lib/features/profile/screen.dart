import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/widgets.dart';
import '../auth/state.dart';
import '../offers/promotion.dart';

final profileResetProvider = StateProvider<int>((ref) => 0);
final profileDirtyProvider = StateProvider<bool>((ref) => false);
Future<bool> confirmProfileExit(BuildContext context) async =>
    await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Leave unsaved preferences?'),
        content: const Text('Your changes have not been saved.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Keep editing'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Discard changes'),
          ),
        ],
      ),
    ) ??
    false;

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});
  @override
  ConsumerState<ProfileScreen> createState() => _ProfileState();
}

class _ProfileState extends ConsumerState<ProfileScreen> {
  late TextEditingController name;
  final form = GlobalKey<FormState>();
  bool notifications = true;
  bool busy = false;
  String originalName = '';
  bool originalNotifications = true;
  void trackChanges() {
    ref.read(profileDirtyProvider.notifier).state =
        name.text != originalName || notifications != originalNotifications;
  }

  @override
  void initState() {
    super.initState();
    final user = ref.read(sessionProvider);
    name = TextEditingController(text: user?['name'] ?? '');
    notifications = user?['notificationEnabled'] ?? true;
    originalName = name.text;
    originalNotifications = notifications;
    name.addListener(trackChanges);
  }

  @override
  void dispose() {
    name.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(profileResetProvider, (previous, next) {
      name.text = originalName;
      setState(() => notifications = originalNotifications);
      trackChanges();
    });
    return Scaffold(
      appBar: AppBar(title: const Text('Your account')),
      body: Form(
        key: form,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const CircleAvatar(
              radius: 40,
              child: Icon(Icons.person_outline, size: 42),
            ),
            const SizedBox(height: 24),
            Text(
              ref.watch(sessionProvider)?['email'] ?? '',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            TextFormField(
              controller: name,
              maxLength: 100,
              validator: (value) => (value?.trim().length ?? 0) < 2
                  ? 'Enter at least two characters.'
                  : null,
              decoration: const InputDecoration(labelText: 'Your name'),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('In-app notifications'),
              value: notifications,
              onChanged: (v) => setState(() {
                notifications = v;
                trackChanges();
              }),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: busy
                  ? null
                  : () async {
                      if (!form.currentState!.validate()) return;
                      FocusScope.of(context).unfocus();
                      setState(() => busy = true);
                      try {
                        await ref
                            .read(sessionProvider.notifier)
                            .update(name.text.trim(), notifications);
                        originalName = name.text;
                        originalNotifications = notifications;
                        trackChanges();
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Profile saved.')),
                          );
                        }
                      } catch (e) {
                        if (context.mounted) showError(context, e);
                      } finally {
                        if (mounted) setState(() => busy = false);
                      }
                    },
              child: const Text('Save preferences'),
            ),
            const SizedBox(height: 18),
            ListTile(
              leading: const Icon(Icons.receipt_long_outlined),
              title: const Text('Purchase receipts'),
              subtitle: const Text('Optional purchase verification'),
              onTap: () => context.push('/receipt-home'),
            ),
            ListTile(
              leading: const Icon(Icons.history_rounded),
              title: const Text('Purchase history'),
              subtitle: const Text(
                'View your receipts and verification status',
              ),
              onTap: () => context.push('/transactions'),
            ),
            const SizedBox(height: 18),
            const Text(
              'Parrot Rewards helps you discover offers and save discount claims. Present your claim to the provider to redeem your discount. A claim does not confirm payment or admission.',
            ),
            const SizedBox(height: 20),
            OutlinedButton(
              onPressed: () async {
                if (ref.read(profileDirtyProvider) &&
                    !await confirmProfileExit(context)) {
                  return;
                }
                ref.read(profileDirtyProvider.notifier).state = false;
                try {
                  await ref.read(promoProvider.notifier).clear();
                  await ref.read(sessionProvider.notifier).logout();
                } catch (_) {}
                if (context.mounted) context.go('/welcome');
              },
              child: const Text('Sign out'),
            ),
          ],
        ),
      ),
    );
  }
}

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});
  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsState();
}

class _NotificationsState extends ConsumerState<NotificationsScreen> {
  late Future<dynamic> notifications;
  int page = 1;
  bool marking = false;
  @override
  void initState() {
    super.initState();
    load();
  }

  void load() => setState(() {
    notifications = ref.read(apiProvider).get('/notifications?page=$page');
  });
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Updates'),
      actions: [
        TextButton(
          onPressed: marking
              ? null
              : () async {
                  setState(() => marking = true);
                  try {
                    await ref
                        .read(apiProvider)
                        .patch('/notifications/read-all', {});
                    load();
                  } catch (e) {
                    if (context.mounted) showError(context, e);
                  } finally {
                    if (mounted) setState(() => marking = false);
                  }
                },
          child: const Text('Mark all read'),
        ),
      ],
    ),
    body: AsyncContent(
      future: notifications,
      retry: load,
      builder: (data) => ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if ((data as List).isEmpty)
            const Padding(
              padding: EdgeInsets.all(32),
              child: Text(
                'You’re all caught up. Purchase status updates will appear here.',
              ),
            ),
          ...data.map(
            (n) => Card(
              child: ListTile(
                leading: Icon(
                  n['readAt'] == null
                      ? Icons.notifications_active_outlined
                      : Icons.notifications_none,
                ),
                title: Text(n['title']),
                subtitle: Text(n['body']),
                trailing: n['readAt'] == null ? const Text('Unread') : null,
                onTap: () async {
                  try {
                    await ref
                        .read(apiProvider)
                        .patch('/notifications/${n['id']}/read', {});
                    load();
                  } catch (e) {
                    if (context.mounted) showError(context, e);
                  }
                },
              ),
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
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
  );
}
