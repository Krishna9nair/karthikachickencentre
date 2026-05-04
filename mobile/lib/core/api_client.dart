import 'package:dio/dio.dart';

import '../app/env.dart';
import 'auth_storage.dart';

/// Thin singleton wrapping a configured Dio client. Every API call passes
/// through here so we can inject `Authorization: Bearer <session_token>`
/// from [AuthStorage] without each repository repeating itself.
class ApiClient {
  ApiClient._() {
    _dio = Dio(
      BaseOptions(
        baseUrl: Env.apiBaseUrl,
        connectTimeout: const Duration(seconds: 12),
        receiveTimeout: const Duration(seconds: 18),
        sendTimeout: const Duration(seconds: 12),
        headers: <String, String>{
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        // 4xx should resolve so we can surface backend error messages.
        validateStatus: (int? status) => status != null && status < 500,
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (RequestOptions options, RequestInterceptorHandler handler) {
          final String? token = AuthStorage.instance.token;
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
      ),
    );
  }

  static final ApiClient instance = ApiClient._();
  late final Dio _dio;

  Dio get dio => _dio;

  /// Called once from main() to give a chance for early init hooks. Currently
  /// just touches the singleton so the constructor side-effects fire.
  void bootstrap() {}

  /// Friendlier error → user-facing string. Backends return messages as
  /// either {"detail": "..."} (FastAPI) or {"error": "..."}.
  static String describeError(Object error) {
    if (error is DioException) {
      final dynamic data = error.response?.data;
      if (data is Map) {
        final dynamic detail = data['detail'] ?? data['error'] ?? data['message'];
        if (detail is String && detail.isNotEmpty) return detail;
      }
      switch (error.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.receiveTimeout:
        case DioExceptionType.sendTimeout:
          return 'Network timeout. Please check your connection.';
        case DioExceptionType.connectionError:
          return 'No internet connection.';
        case DioExceptionType.badResponse:
          return 'Server error (${error.response?.statusCode ?? '?'}). Please try again.';
        case DioExceptionType.cancel:
          return 'Request cancelled.';
        case DioExceptionType.badCertificate:
          return 'Secure connection failed.';
        case DioExceptionType.unknown:
          return error.message ?? 'Something went wrong.';
      }
    }
    return error.toString();
  }
}
