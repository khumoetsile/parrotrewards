import 'dart:convert';

import '../../core/navigation.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import 'state.dart';
import '../offers/promotion.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});
  @override
  ConsumerState<SplashScreen> createState() => _SplashState();
}

class _SplashState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      final restored = await ref.read(sessionProvider.notifier).restore();
      final destination = restored
          ? await ref.read(promoProvider.notifier).destinationAfterAuth()
          : '/welcome';
      if (mounted) context.go(destination);
    });
  }

  @override
  Widget build(BuildContext context) => const Scaffold(
    body: Center(
      child: Text(
        'Parrot Rewards',
        style: TextStyle(
          fontSize: 52,
          fontWeight: FontWeight.w800,
          color: Color(0xff16755d),
        ),
      ),
    ),
  );
}

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: LayoutBuilder(
        builder: (context, bounds) => SingleChildScrollView(
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: bounds.maxHeight),
            child: Padding(
              padding: const EdgeInsets.all(28),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Parrot Rewards',
                    style: TextStyle(
                      fontSize: 30,
                      fontWeight: FontWeight.w900,
                      color: Color(0xff16755d),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 32),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(
                          Icons.flutter_dash,
                          size: 90,
                          color: Color(0xff16755d),
                        ),
                        const SizedBox(height: 24),
                        Text(
                          'More experiences.\nBetter discounts.',
                          style: Theme.of(context).textTheme.headlineLarge
                              ?.copyWith(fontWeight: FontWeight.w900),
                        ),
                        const SizedBox(height: 18),
                        const Text(
                          'Discover music festival discounts, hardware finds and auto spares. Save an offer in My Claims and present it for provider validation.',
                          style: TextStyle(fontSize: 17, height: 1.6),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Save a discount, then present your claim to the provider. A claim does not confirm payment or admission.',
                          style: TextStyle(
                            height: 1.5,
                            color: Color(0xff5b6d60),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      FilledButton(
                        onPressed: () => context.go('/register'),
                        child: const Text('Get started'),
                      ),
                      TextButton(
                        onPressed: () => context.go('/login'),
                        child: const Text('Already a member? Sign in'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

class AuthScreen extends ConsumerStatefulWidget {
  final bool register;
  const AuthScreen({super.key, this.register = false});
  @override
  ConsumerState<AuthScreen> createState() => _AuthState();
}

class _AuthState extends ConsumerState<AuthScreen> {
  final form = GlobalKey<FormState>();
  final email = TextEditingController();
  final password = TextEditingController();
  final name = TextEditingController();
  bool busy = false;
  bool showPassword = false;
  String? error;
  @override
  void dispose() {
    email.dispose();
    password.dispose();
    name.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (busy || !form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await ref
          .read(sessionProvider.notifier)
          .login(
            email.text.trim(),
            password.text,
            name: widget.register ? name.text.trim() : null,
          );
      final destination = await ref
          .read(promoProvider.notifier)
          .destinationAfterAuth();
      if (mounted) context.go(destination);
    } catch (e) {
      if (mounted) {
        setState(() => error = e is StateError ? e.message : errorMessage(e));
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Parrot Rewards'),
      leading: IconButton(
        icon: const Icon(Icons.arrow_back),
        onPressed: () => goBack(context, '/welcome'),
      ),
    ),
    body: Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: Form(
            key: form,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  widget.register
                      ? 'Join your local community'
                      : 'Welcome back',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 12),
                if (widget.register)
                  const Padding(
                    padding: EdgeInsets.only(bottom: 12),
                    child: Text(
                      'We use your name and email for your account and claims. Promotional links may record campaign attribution. No payment details are collected.',
                    ),
                  ),
                const SizedBox(height: 12),
                if (widget.register) ...[
                  TextFormField(
                    controller: name,
                    decoration: const InputDecoration(labelText: 'Your name'),
                    validator: (v) =>
                        (v?.trim().length ?? 0) < 2 ? 'Enter your name' : null,
                  ),
                  const SizedBox(height: 16),
                ],
                TextFormField(
                  controller: email,
                  keyboardType: TextInputType.emailAddress,
                  autofillHints: const [AutofillHints.email],
                  decoration: const InputDecoration(labelText: 'Email address'),
                  validator: (v) =>
                      v != null &&
                          RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
                              .hasMatch(v.trim())
                      ? null
                      : 'Enter a valid email',
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: password,
                  obscureText: !showPassword,
                  textInputAction: TextInputAction.done,
                  onFieldSubmitted: (_) => submit(),
                  autofillHints: [
                    widget.register
                        ? AutofillHints.newPassword
                        : AutofillHints.password,
                  ],
                  decoration: InputDecoration(
                    labelText: 'Password',
                    helperText: widget.register
                        ? '12+ characters, maximum 72 UTF-8 bytes'
                        : null,
                    suffixIcon: IconButton(
                      tooltip: showPassword ? 'Hide password' : 'Show password',
                      icon: Icon(
                        showPassword
                            ? Icons.visibility_off_outlined
                            : Icons.visibility_outlined,
                      ),
                      onPressed: () =>
                          setState(() => showPassword = !showPassword),
                    ),
                  ),
                  validator: (v) => (v?.length ?? 0) < 12
                      ? 'Use at least 12 characters'
                      : utf8.encode(v!).length > 72
                      ? 'Use a password within 72 UTF-8 bytes'
                      : null,
                ),
                const SizedBox(height: 24),
                if (error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(
                      error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ),
                FilledButton(
                  onPressed: busy ? null : submit,
                  child: Text(
                    busy
                        ? 'Please wait…'
                        : widget.register
                        ? 'Create account'
                        : 'Sign in',
                  ),
                ),
                if (!widget.register)
                  TextButton(
                    onPressed: () => context.push('/forgot'),
                    child: const Text('Forgot password?'),
                  ),
                TextButton(
                  onPressed: () =>
                      context.go(widget.register ? '/login' : '/register'),
                  child: Text(
                    widget.register
                        ? 'I already have an account'
                        : 'Create an account',
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

class RecoveryScreen extends ConsumerStatefulWidget {
  const RecoveryScreen({super.key});
  @override
  ConsumerState<RecoveryScreen> createState() => _RecoveryState();
}

class _RecoveryState extends ConsumerState<RecoveryScreen> {
  final email = TextEditingController(),
      code = TextEditingController(),
      password = TextEditingController();
  final form = GlobalKey<FormState>();
  bool busy = false, resetting = false, done = false, showPassword = false;
  String? error;
  String message = '';
  @override
  void dispose() {
    email.dispose();
    code.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (busy || !form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() {
      busy = true;
      error = null;
    });
    try {
      if (resetting) {
        await ref.read(apiProvider).post('/auth/reset-password', {
          'token': code.text.trim(),
          'password': password.text,
        });
        if (mounted) setState(() => done = true);
      } else {
        final result = await ref.read(apiProvider).post(
          '/auth/forgot-password',
          {'email': email.text.trim()},
        );
        if (mounted) {
          setState(() {
            message = result['message'];
            resetting = true;
          });
        }
      }
    } catch (e) {
      if (mounted) setState(() => error = errorMessage(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Account recovery'),
      leading: IconButton(
        tooltip: 'Back to sign in',
        onPressed: () => goBack(context, '/login'),
        icon: const Icon(Icons.arrow_back),
      ),
    ),
    body: Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: done
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Icon(
                      Icons.check_circle_outline,
                      size: 64,
                      color: Color(0xff16755d),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'Password updated',
                      style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text('You can now sign in with your new password.'),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: () => context.go('/login'),
                      child: const Text('Sign in'),
                    ),
                  ],
                )
              : Form(
                  key: form,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        resetting
                            ? 'Choose a new password'
                            : 'Forgot your password?',
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        resetting
                            ? 'Paste the recovery code from your email. Codes expire after 30 minutes and can only be used once.'
                            : 'Enter your account email to receive a recovery code.',
                      ),
                      const SizedBox(height: 20),
                      if (!resetting)
                        TextFormField(
                          controller: email,
                          keyboardType: TextInputType.emailAddress,
                          autofillHints: const [AutofillHints.email],
                          decoration: const InputDecoration(
                            labelText: 'Email address',
                          ),
                          validator: (v) =>
                              RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
                                  .hasMatch(v?.trim() ?? '')
                              ? null
                              : 'Enter a valid email',
                        ),
                      if (resetting) ...[
                        if (message.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 16),
                            child: Text(message),
                          ),
                        TextFormField(
                          controller: code,
                          autocorrect: false,
                          enableSuggestions: false,
                          decoration: const InputDecoration(
                            labelText: 'Recovery code',
                          ),
                          validator: (v) => (v?.trim().length ?? 0) < 32
                              ? 'Paste the complete recovery code'
                              : null,
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: password,
                          obscureText: !showPassword,
                          autofillHints: const [AutofillHints.newPassword],
                          decoration: InputDecoration(
                            labelText: 'New password',
                            helperText: 'At least 12 characters',
                            suffixIcon: IconButton(
                              tooltip: showPassword
                                  ? 'Hide password'
                                  : 'Show password',
                              icon: Icon(
                                showPassword
                                    ? Icons.visibility_off
                                    : Icons.visibility,
                              ),
                              onPressed: () =>
                                  setState(() => showPassword = !showPassword),
                            ),
                          ),
                          validator: (v) => (v?.length ?? 0) < 12
                              ? 'Use at least 12 characters'
                              : utf8.encode(v!).length > 72
                              ? 'Use a password within 72 UTF-8 bytes'
                              : null,
                        ),
                      ],
                      const SizedBox(height: 20),
                      if (error != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Semantics(
                            liveRegion: true,
                            child: Text(
                              error!,
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.error,
                              ),
                            ),
                          ),
                        ),
                      FilledButton(
                        onPressed: busy ? null : submit,
                        child: Text(
                          busy
                              ? 'Please wait…'
                              : resetting
                              ? 'Update password'
                              : 'Send recovery code',
                        ),
                      ),
                      TextButton(
                        onPressed: busy
                            ? null
                            : () => setState(() {
                                resetting = !resetting;
                                error = null;
                              }),
                        child: Text(
                          resetting
                              ? 'Request another code'
                              : 'I already have a recovery code',
                        ),
                      ),
                    ],
                  ),
                ),
        ),
      ),
    ),
  );
}
