import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../auth/state.dart';

const privacyContact = 'kmolabi@gmail.com';
const privacyPolicyUrl = 'https://parrotrewards.org/privacy-policy';
const deletionRequestUrl = 'https://parrotrewards.org/account-deletion';

final externalLinkProvider = Provider<Future<bool> Function(Uri)>(
  (ref) =>
      (uri) => launchUrl(uri, mode: LaunchMode.externalApplication),
);

Future<void> openPrivacyLink(WidgetRef ref, BuildContext context, Uri uri) =>
    openPublicPrivacyLink(context, uri, launch: ref.read(externalLinkProvider));

Future<void> openPublicPrivacyLink(
  BuildContext context,
  Uri uri, {
  Future<bool> Function(Uri)? launch,
}) async {
  try {
    if (await (launch ??
        (target) =>
            launchUrl(target, mode: LaunchMode.externalApplication))(uri)) {
      return;
    }
  } catch (_) {
    // Keep the address available when no browser/mail application is installed.
  }
  if (!context.mounted) return;
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(
        uri.scheme == 'mailto'
            ? 'Could not open email. Send your request to $privacyContact, or copy the request below.'
            : 'Could not open the browser. Visit $uri.',
      ),
    ),
  );
}

String deletionRequestText(String email) =>
    'I request deletion of my Parrot Rewards account and its associated data.\n\n'
    'Account email: ${email.isEmpty ? '[enter your account email]' : email}\n\n'
    'Please verify ownership, explain any records that must be retained and why, '
    'and confirm when deletion is completed.\n\nDo not include a password or sign-in token.';

class AccountDeletionScreen extends ConsumerWidget {
  const AccountDeletionScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final email = ref.watch(sessionProvider)?['email'] as String? ?? '';
    final request = deletionRequestText(email);
    final mail = Uri(
      scheme: 'mailto',
      path: privacyContact,
      query: {'subject': 'Parrot Rewards account deletion request', 'body': request}
          .entries
          .map(
            (e) =>
                '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value)}',
          )
          .join('&'),
    );
    return Scaffold(
      appBar: AppBar(title: const Text('Request account deletion')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text(
            'Delete your account and data',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 16),
          const Text(
            'Parrot handles deletion requests manually. Email the operator from the email address used for your account. You may be asked to verify ownership.',
          ),
          const SizedBox(height: 12),
          const SelectableText(privacyContact),
          const SizedBox(height: 16),
          const Text(
            'The request can cover your account details, claims, receipt images and related purchase-verification data. Ask Parrot to identify any records that must be retained and explain the reason and applicable period.',
          ),
          const SizedBox(height: 12),
          const Text(
            'Opening an email draft or sending a request does not immediately erase your account. Parrot will confirm processing. You do not need to reinstall the app to request deletion.',
          ),
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: () => openPrivacyLink(ref, context, mail),
            icon: const Icon(Icons.email_outlined),
            label: const Text('Open email request'),
          ),
          TextButton.icon(
            onPressed: () async {
              await Clipboard.setData(
                ClipboardData(
                  text:
                      'To: $privacyContact\nSubject: Parrot Rewards account deletion request\n\n$request',
                ),
              );
              if (context.mounted) {
                ScaffoldMessenger.of(context).hideCurrentSnackBar();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text(
                      'Request copied. Paste it into your email app and send it to Parrot.',
                    ),
                  ),
                );
              }
            },
            icon: const Icon(Icons.copy),
            label: const Text('Copy deletion request'),
          ),
          TextButton(
            onPressed: () =>
                openPrivacyLink(ref, context, Uri.parse(deletionRequestUrl)),
            child: const Text('Open deletion-request webpage'),
          ),
          TextButton(
            onPressed: () =>
                openPrivacyLink(ref, context, Uri.parse(privacyPolicyUrl)),
            child: const Text('Read the privacy policy'),
          ),
          const SizedBox(height: 12),
          const Text('Request text'),
          SelectableText(request),
        ],
      ),
    );
  }
}
