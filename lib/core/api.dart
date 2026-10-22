import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const apiUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'https://api.parrotrewards.org/api',
);
final apiProvider = Provider<Api>((ref) => Api());

class Api {
  final Dio dio;
  final FlutterSecureStorage storage;
  Future<void>? _refreshing;
  Api({Dio? client, FlutterSecureStorage? secureStorage})
    : dio =
          client ??
          Dio(
            BaseOptions(
              baseUrl: apiUrl,
              connectTimeout: const Duration(seconds: 10),
              receiveTimeout: const Duration(seconds: 30),
            ),
          ),
      storage = secureStorage ?? const FlutterSecureStorage() {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await storage.read(key: 'accessToken');
          if (token != null) options.headers['Authorization'] = 'Bearer $token';
          handler.next(options);
        },
        onError: (error, handler) async {
          final options = error.requestOptions;
          if (error.response?.statusCode == 401 &&
              options.extra['retried'] != true &&
              !options.path.startsWith('/auth/')) {
            try {
              _refreshing ??= _refresh();
              await _refreshing;
              options.extra['retried'] = true;
              options.headers['Authorization'] =
                  'Bearer ${await storage.read(key: 'accessToken')}';
              if (options.data is FormData) {
                options.data = (options.data as FormData).clone();
              }
              handler.resolve(await dio.fetch(options));
              return;
            } catch (_) {
              await clear();
            } finally {
              _refreshing = null;
            }
          }
          handler.next(error);
        },
      ),
    );
  }
  Future<void> _refresh() async {
    final token = await storage.read(key: 'refreshToken');
    if (token == null) throw StateError('No session');
    final response = await dio.post(
      '/auth/refresh',
      data: {'refreshToken': token},
    );
    await save(Map<String, dynamic>.from(response.data['data']));
  }

  Future<void> save(Map<String, dynamic> data) async {
    for (final key in ['accessToken', 'refreshToken']) {
      await storage.write(key: key, value: data[key] as String);
    }
  }

  Future<void> clear() async {
    await storage.delete(key: 'accessToken');
    await storage.delete(key: 'refreshToken');
  }

  Future<dynamic> get(String path) async => (await dio.get(path)).data['data'];
  Future<dynamic> post(String path, dynamic data) async =>
      (await dio.post(path, data: data)).data['data'];
  Future<dynamic> patch(String path, dynamic data) async =>
      (await dio.patch(path, data: data)).data['data'];
}

String errorMessage(Object error) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map && data['error'] is Map) {
      return data['error']['message'] as String;
    }
    return 'Could not connect. Check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}
