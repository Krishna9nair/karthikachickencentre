import 'package:dio/dio.dart';

import '../../core/api_client.dart';

/// Wraps the `/api/wheel/*` endpoints. Mirrors the website's `SundayWheel`
/// component behaviour 1:1.
class WheelRepository {
  WheelRepository._();
  static final WheelRepository instance = WheelRepository._();
  final Dio _dio = ApiClient.instance.dio;

  /// Returns the current wheel state. The phone is optional — without it
  /// the backend just tells you whether it's Sunday + enabled.
  Future<Map<String, dynamic>> status({String? phone}) async {
    try {
      final Response<dynamic> r = await _dio.get<dynamic>(
        '/api/wheel/status',
        queryParameters: <String, dynamic>{
          if (phone != null && phone.length == 10) 'phone': phone,
        },
      );
      final dynamic data = r.data;
      if (data is Map) return Map<String, dynamic>.from(data);
      return <String, dynamic>{'eligible': false};
    } catch (_) {
      // Fail-open like the website does — let the user try a spin and
      // surface a real error from the spin call.
      return <String, dynamic>{'eligible': true, 'is_sunday': true};
    }
  }

  /// Spin the wheel for `phone`. Returns:
  ///   - `segment_index` (0..5)
  ///   - `prize` { label, kind, value, coupon_code }
  ///   - `already_spun: true` if the phone already used today's spin.
  Future<Map<String, dynamic>> spin(String phone) async {
    final Response<dynamic> r = await _dio.post<dynamic>(
      '/api/wheel/spin',
      data: <String, dynamic>{'phone': phone},
    );
    final int code = r.statusCode ?? 0;
    if (code >= 200 && code < 300) {
      return Map<String, dynamic>.from(r.data as Map<dynamic, dynamic>);
    }
    final dynamic data = r.data;
    String detail = 'Could not spin';
    if (data is Map && data['detail'] is String) {
      detail = data['detail'] as String;
    }
    throw DioException(
      requestOptions: r.requestOptions,
      response: r,
      type: DioExceptionType.badResponse,
      message: detail,
      error: detail,
    );
  }
}
