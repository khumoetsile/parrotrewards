import 'dart:io';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../core/api.dart';
import '../../core/widgets.dart';

final imagePickerProvider = Provider<ImagePicker>((ref) => ImagePicker());

class CaptureScreen extends ConsumerStatefulWidget {
  final String? shopId;
  const CaptureScreen({super.key, this.shopId});
  @override
  ConsumerState<CaptureScreen> createState() => _CaptureState();
}

class _CaptureState extends ConsumerState<CaptureScreen> {
  final amount = TextEditingController();
  final token = TextEditingController();
  final form = GlobalKey<FormState>();
  final key = List.generate(
    24,
    (_) => Random.secure().nextInt(256).toRadixString(16).padLeft(2, '0'),
  ).join();
  Map<String, dynamic>? shop;
  XFile? photo;
  String? receiptId;
  bool busy = false;
  double progress = 0;
  bool submitted = false;
  bool attempted = false;
  @override
  void dispose() {
    amount.dispose();
    token.dispose();
    super.dispose();
  }

  Future<void> resolve(String raw) async {
    if (busy) return;
    setState(() => busy = true);
    try {
      final result = Map<String, dynamic>.from(
        await ref.read(apiProvider).post('/qr/resolve', {'token': raw}),
      );
      if (widget.shopId != null && result['id'] != widget.shopId) {
        throw StateError('This code belongs to a different shop.');
      }
      if (mounted) setState(() => shop = result);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e is StateError ? e.message : errorMessage(e)),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> scan() async {
    final result = await Navigator.of(context)
        .push<String>(MaterialPageRoute(builder: (_) => const ScannerScreen()));
    if (result != null && mounted) await resolve(result);
  }

  Future<void> pick(ImageSource source) async {
    try {
      final result = await ref
          .read(imagePickerProvider)
          .pickImage(
            source: source,
            imageQuality: 90,
            maxWidth: 2000,
            maxHeight: 3000,
          );
      if (result != null && mounted) {
        setState(() {
          photo = result;
          receiptId = null;
        });
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Camera or photo access is unavailable. Allow access in device settings, or choose a photo.',
            ),
          ),
        );
      }
    }
  }

  Future<void> submit() async {
    if (!form.currentState!.validate() ||
        shop == null ||
        photo == null ||
        busy) {
      return;
    }
    setState(() {
      busy = true;
      progress = 0;
      attempted = true;
    });
    try {
      final api = ref.read(apiProvider);
      if (receiptId == null) {
        final response = await api.dio.post(
          '/receipts',
          data: FormData.fromMap({
            'receipt': await MultipartFile.fromFile(
              photo!.path,
              filename: photo!.name,
              contentType: DioMediaType('image', 'jpeg'),
            ),
          }),
          onSendProgress: (sent, total) {
            if (mounted && total > 0) setState(() => progress = sent / total);
          },
        );
        receiptId = response.data['data']['id'] as String;
      }
      final result = await api.post('/transactions', {
        'shopId': shop!['id'],
        'receiptId': receiptId,
        'amount': amount.text.trim(),
        'idempotencyKey': key,
      });
      submitted = true;
      if (mounted) context.replace('/transactions/${result['id']}');
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !busy,
    child: Scaffold(
      appBar: AppBar(title: const Text('Record a purchase')),
      body: Form(
        key: form,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const Text(
              '1  Identify your shop',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            if (shop == null) ...[
              FilledButton.icon(
                onPressed: busy ? null : scan,
                icon: const Icon(Icons.qr_code_scanner),
                label: const Text('Scan shop QR'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: token,
                decoration: const InputDecoration(
                  labelText: 'QR text (alternative to camera)',
                ),
              ),
              TextButton(
                onPressed: busy ? null : () => resolve(token.text.trim()),
                child: const Text('Identify shop'),
              ),
            ] else
              Card(
                child: ListTile(
                  leading: const Icon(
                    Icons.check_circle,
                    color: Color(0xff16755d),
                  ),
                  title: Text(shop!['name']),
                  subtitle: Text(shop!['address']),
                ),
              ),
            const SizedBox(height: 24),
            const Text(
              '2  Purchase amount',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: amount,
              enabled: !busy && !attempted,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: const InputDecoration(
                labelText: 'Total paid',
                prefixText: 'BWP  ',
              ),
              validator: (v) =>
                  v != null &&
                      RegExp(r'^(0|[1-9]\d{0,7})(\.\d{1,2})?$')
                          .hasMatch(v.trim()) &&
                      (double.tryParse(v) ?? 0) > 0
                  ? null
                  : 'Enter an amount greater than zero, with at most 2 decimals',
            ),
            const SizedBox(height: 24),
            const Text(
              '3  Add your receipt',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Keep the shop name, date and total visible. JPEG, PNG or WebP, up to 8 MB.',
            ),
            const SizedBox(height: 12),
            if (photo != null)
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.file(
                  File(photo!.path),
                  height: 220,
                  fit: BoxFit.contain,
                  semanticLabel: 'Selected receipt',
                ),
              ),
            Wrap(
              spacing: 8,
              children: [
                OutlinedButton.icon(
                  onPressed: busy || attempted
                      ? null
                      : () => pick(ImageSource.camera),
                  icon: const Icon(Icons.camera_alt_outlined),
                  label: const Text('Take photo'),
                ),
                OutlinedButton.icon(
                  onPressed: busy || attempted
                      ? null
                      : () => pick(ImageSource.gallery),
                  icon: const Icon(Icons.photo_outlined),
                  label: const Text('Choose photo'),
                ),
              ],
            ),
            const SizedBox(height: 24),
            const Text(
              'A submission records your purchase. Verification happens separately. No payment is processed.',
            ),
            const SizedBox(height: 20),
            if (busy) ...[
              LinearProgressIndicator(value: progress == 0 ? null : progress),
              const SizedBox(height: 12),
            ],
            FilledButton(
              onPressed: busy || shop == null || photo == null || submitted
                  ? null
                  : submit,
              child: Text(
                busy
                    ? 'Submitting…'
                    : attempted
                    ? 'Retry same submission'
                    : 'Submit purchase',
              ),
            ),
            if (attempted && !submitted)
              const Padding(
                padding: EdgeInsets.only(top: 12),
                child: Text(
                  'Retry keeps the same submission key to prevent duplicate purchases. Return and start again to change the amount or photo.',
                ),
              ),
          ],
        ),
      ),
    ),
  );
}

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({super.key});
  @override
  State<ScannerScreen> createState() => _ScannerState();
}

class _ScannerState extends State<ScannerScreen> {
  bool found = false;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Scan shop QR')),
    body: MobileScanner(
      onDetect: (capture) {
        if (found) return;
        for (final code in capture.barcodes) {
          final raw = code.rawValue;
          if (raw != null) {
            found = true;
            Navigator.pop(context, raw);
            break;
          }
        }
      },
      errorBuilder: (context, error) => const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'Camera unavailable. Allow camera access in device settings, or go back and paste the shop QR text.',
          ),
        ),
      ),
    ),
  );
}
