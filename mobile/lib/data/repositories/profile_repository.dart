import 'package:dio/dio.dart';

import '../../core/api_client.dart';
import '../models/address.dart';

class ProfileRepository {
  ProfileRepository._();
  static final ProfileRepository instance = ProfileRepository._();
  final Dio _dio = ApiClient.instance.dio;

  Future<Map<String, dynamic>> profile() async {
    final Response<dynamic> r = await _dio.get<dynamic>('/api/customer/profile');
    if (r.statusCode == 401) return <String, dynamic>{};
    if (r.data is Map) return Map<String, dynamic>.from(r.data as Map<dynamic, dynamic>);
    return <String, dynamic>{};
  }

  Future<void> updateName(String name) async {
    final Response<dynamic> r = await _dio.put<dynamic>(
      '/api/customer/profile',
      data: <String, dynamic>{'name': name},
    );
    _ensureOk(r);
  }

  Future<List<CustomerAddress>> listAddresses() async {
    final Response<dynamic> r = await _dio.get<dynamic>('/api/customer/addresses');
    if (r.statusCode == 401) return <CustomerAddress>[];
    final dynamic data = r.data;
    if (data is! Map) return <CustomerAddress>[];
    final List<dynamic> raw =
        (data['addresses'] as List<dynamic>?) ?? <dynamic>[];
    return raw
        .whereType<Map<dynamic, dynamic>>()
        .map((Map<dynamic, dynamic> j) =>
            CustomerAddress.fromJson(Map<String, dynamic>.from(j)))
        .toList();
  }

  Future<CustomerAddress?> createAddress({
    required String label,
    required String address,
    double? lat,
    double? lng,
    bool isDefault = false,
  }) async {
    final Response<dynamic> r = await _dio.post<dynamic>(
      '/api/customer/addresses',
      data: <String, dynamic>{
        'label': label,
        'address': address,
        if (lat != null) 'lat': lat,
        if (lng != null) 'lng': lng,
        'is_default': isDefault,
      },
    );
    _ensureOk(r);
    final dynamic data = r.data;
    if (data is Map && data['address'] is Map) {
      return CustomerAddress.fromJson(
        Map<String, dynamic>.from(data['address'] as Map<dynamic, dynamic>),
      );
    }
    return null;
  }

  Future<void> updateAddress(String id, Map<String, dynamic> body) async {
    final Response<dynamic> r =
        await _dio.put<dynamic>('/api/customer/addresses/$id', data: body);
    _ensureOk(r);
  }

  Future<void> deleteAddress(String id) async {
    final Response<dynamic> r =
        await _dio.delete<dynamic>('/api/customer/addresses/$id');
    _ensureOk(r);
  }

  void _ensureOk(Response<dynamic> r) {
    final int code = r.statusCode ?? 0;
    if (code >= 200 && code < 300) return;
    final dynamic data = r.data;
    String detail = 'Request failed ($code).';
    if (data is Map && data['detail'] is String) detail = data['detail'] as String;
    throw DioException(
      requestOptions: r.requestOptions,
      response: r,
      type: DioExceptionType.badResponse,
      message: detail,
      error: detail,
    );
  }
}
