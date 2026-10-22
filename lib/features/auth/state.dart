import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api.dart';

final sessionProvider = StateNotifierProvider<Session, Map<String, dynamic>?>(
  (ref) => Session(ref.read(apiProvider)),
);

class Session extends StateNotifier<Map<String, dynamic>?> {
  final Api api;
  Session(this.api) : super(null);
  Future<bool> restore() async {
    try {
      if (await api.storage.read(key: 'accessToken') == null) return false;
      state = Map<String, dynamic>.from(await api.get('/me'));
      return true;
    } catch (_) {
      await api.clear();
      state = null;
      return false;
    }
  }

  Future<void> login(String email, String password, {String? name}) async {
    final result = Map<String, dynamic>.from(
      await api.post(name == null ? '/auth/login' : '/auth/register', {
        'email': email,
        'password': password,
        'name': ?name,
      }),
    );
    if (result['user']['role'] != 'CUSTOMER') {
      throw StateError('Use the partner portal for this account.');
    }
    await api.save(result);
    state = Map<String, dynamic>.from(result['user']);
  }

  Future<void> update(String name, bool notifications) async {
    state = Map<String, dynamic>.from(
      await api.patch('/me', {
        'name': name,
        'notificationEnabled': notifications,
      }),
    );
  }

  Future<void> logout() async {
    try {
      await api.post('/auth/logout', {
        'refreshToken': await api.storage.read(key: 'refreshToken') ?? '',
      });
    } finally {
      await api.clear();
      state = null;
    }
  }
}
