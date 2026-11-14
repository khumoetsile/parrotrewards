import 'dart:async';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_application_1/core/api.dart';
import 'package:flutter_application_1/features/auth/state.dart';

class SessionAdapter implements HttpClientAdapter {
  final Future<ResponseBody> Function(RequestOptions) respond;
  SessionAdapter(this.respond);
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) => respond(options);
  @override
  void close({bool force = false}) {}
}

ResponseBody json(String text, [int status = 200]) => ResponseBody.fromString(
  text,
  status,
  headers: {
    Headers.contentTypeHeader: ['application/json'],
  },
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(
    () => FlutterSecureStorage.setMockInitialValues({
      'accessToken': 'old-access',
      'refreshToken': 'old-refresh',
    }),
  );
  Api client(Future<ResponseBody> Function(RequestOptions) respond) {
    final dio = Dio(BaseOptions(baseUrl: 'https://example.test'))
      ..httpClientAdapter = SessionAdapter(respond);
    addTearDown(dio.close);
    return Api(client: dio);
  }

  test(
    'offline restore keeps credentials and reports a retryable failure',
    () async {
      final api = client(
        (o) async => throw DioException(
          requestOptions: o,
          type: DioExceptionType.connectionTimeout,
        ),
      );
      final session = Session(api);
      addTearDown(session.dispose);
      await expectLater(session.restore(), throwsA(isA<DioException>()));
      expect(await api.storage.read(key: 'accessToken'), 'old-access');
      expect(await api.storage.read(key: 'refreshToken'), 'old-refresh');
    },
  );
  test('refresh connection errors preserve the original session', () async {
    final api = client(
      (o) async => o.path == '/auth/refresh'
          ? throw DioException(
              requestOptions: o,
              type: DioExceptionType.connectionError,
            )
          : json('{"error":{"message":"Expired"}}', 401),
    );
    final session = Session(api);
    addTearDown(session.dispose);
    await expectLater(
      session.restore(),
      throwsA(
        predicate(
          (e) =>
              e is DioException && e.type == DioExceptionType.connectionError,
        ),
      ),
    );
    expect(await api.storage.read(key: 'refreshToken'), 'old-refresh');
  });
  test('definitively rejected refresh clears invalid credentials', () async {
    final api = client(
      (o) async => json(
        '{"error":{"code":"INVALID_REFRESH","message":"Invalid refresh"}}',
        401,
      ),
    );
    final session = Session(api);
    addTearDown(session.dispose);
    expect(await session.restore(), false);
    expect(await api.storage.read(key: 'accessToken'), isNull);
    expect(await api.storage.read(key: 'refreshToken'), isNull);
  });
  test('concurrent expired requests share one renewal and retry with the new token', () async {
    var renewals = 0;
    final gate = Completer<void>();
    final api = client((o) async {
      if (o.path == '/auth/refresh') {
        renewals++;
        await gate.future;
        return json(
          '{"data":{"accessToken":"new-access","refreshToken":"new-refresh"}}',
        );
      }
      if (o.headers['Authorization'] == 'Bearer old-access') {
        return json('{"error":{"message":"Expired"}}', 401);
      }
      return json('{"data":{"name":"Customer"}}');
    });
    final calls = List.generate(3, (_) => api.get('/me'));
    // Let every initial 401 join the in-flight refresh without a timed sleep.
    for (var i = 0; i < 30 && renewals == 0; i++) {
      await Future<void>.delayed(Duration.zero);
    }
    expect(renewals, 1);
    gate.complete();
    final results = await Future.wait(calls);
    expect(results.every((r) => r['name'] == 'Customer'), true);
    expect(renewals, 1);
    expect(await api.storage.read(key: 'refreshToken'), 'new-refresh');
  });
  test('a server failure after successful renewal does not erase the renewed session', () async {
    final api = client((o) async {
      if (o.path == '/auth/refresh') {
        return json(
          '{"data":{"accessToken":"new-access","refreshToken":"new-refresh"}}',
        );
      }
      return o.headers['Authorization'] == 'Bearer old-access'
          ? json('{"error":{"message":"Expired"}}', 401)
          : json('{"error":{"message":"Service unavailable"}}', 503);
    });
    await expectLater(
      api.get('/me'),
      throwsA(
        predicate((e) => e is DioException && e.response?.statusCode == 503),
      ),
    );
    expect(await api.storage.read(key: 'refreshToken'), 'new-refresh');
  });
}
