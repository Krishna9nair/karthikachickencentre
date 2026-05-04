import 'package:dio/dio.dart';

import '../../core/api_client.dart';
import '../../core/auth_storage.dart';
import '../models/user.dart';

class AuthRepository {
  AuthRepository._();
  static final AuthRepository instance = AuthRepository._();
  final Dio _dio = ApiClient.instance.dio;

  Future<AppUser> signIn({
    required String email,
    required String password,
    bool rememberMe = false,
  }) async {
    final Response<dynamic> r = await _dio.post<dynamic>(
      '/api/auth/login',
      data: <String, dynamic>{
        'email': email,
        'password': password,
        'remember_me': rememberMe,
      },
    );
    _ensureOk(r);
    return _persistFromAuthResponse(r.data as Map<String, dynamic>);
  }

  Future<AppUser> signUp({
    required String email,
    required String password,
    required String name,
    String? phone,
    bool rememberMe = false,
  }) async {
    final Response<dynamic> r = await _dio.post<dynamic>(
      '/api/auth/signup',
      data: <String, dynamic>{
        'email': email,
        'password': password,
        'name': name,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
        'remember_me': rememberMe,
      },
    );
    _ensureOk(r);
    return _persistFromAuthResponse(r.data as Map<String, dynamic>);
  }

  /// Exchange the Emergent Google session_id (URL fragment from
  /// `https://auth.emergentagent.com/?redirect=...`) for a server-issued
  /// `session_token`.
  Future<AppUser> exchangeGoogleSession(String emergentSessionId) async {
    final Response<dynamic> r = await _dio.post<dynamic>(
      '/api/auth/google/session',
      data: <String, dynamic>{'session_id': emergentSessionId},
    );
    _ensureOk(r);
    return _persistFromAuthResponse(r.data as Map<String, dynamic>);
  }

  Future<AppUser?> me() async {
    if (!AuthStorage.instance.isAuthenticated) return null;
    final Response<dynamic> r = await _dio.get<dynamic>('/api/auth/me');
    if (r.statusCode == 401) {
      await AuthStorage.instance.clear();
      return null;
    }
    _ensureOk(r);
    final Map<String, dynamic> data =
        Map<String, dynamic>.from(r.data as Map<dynamic, dynamic>);
    final AppUser user = AppUser.fromJson(data);
    await AuthStorage.instance.updateProfile(
      name: user.name,
      phone: user.phone,
      picture: user.picture,
    );
    return user;
  }

  Future<void> logout() async {
    try {
      await _dio.post<dynamic>('/api/auth/logout');
    } catch (_) {/* best effort */}
    await AuthStorage.instance.clear();
  }

  Future<void> requestPasswordReset(String email) async {
    final Response<dynamic> r = await _dio.post<dynamic>(
      '/api/auth/forgot-password',
      data: <String, dynamic>{'email': email},
    );
    // Backend always returns 200 to prevent enumeration; just trust it.
    if ((r.statusCode ?? 500) >= 500) {
      throw DioException(
        requestOptions: r.requestOptions,
        response: r,
        type: DioExceptionType.badResponse,
      );
    }
  }

  Future<void> resetPassword({
    required String token,
    required String password,
  }) async {
    final Response<dynamic> r = await _dio.post<dynamic>(
      '/api/auth/reset-password',
      data: <String, dynamic>{'token': token, 'password': password},
    );
    _ensureOk(r);
  }

  /// Link a 10-digit phone to the signed-in account so order history /
  /// addresses populate.
  Future<void> linkPhone(String phone) async {
    final Response<dynamic> r = await _dio.post<dynamic>(
      '/api/customer/link-phone',
      data: <String, dynamic>{'phone': phone},
    );
    _ensureOk(r);
    await AuthStorage.instance.updateProfile(phone: phone);
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

  Future<AppUser> _persistFromAuthResponse(Map<String, dynamic> data) async {
    final String? token = data['session_token']?.toString();
    final Map<String, dynamic> userJson =
        Map<String, dynamic>.from(data['user'] as Map<dynamic, dynamic>);
    final AppUser user = AppUser.fromJson(userJson);
    if (token != null && token.isNotEmpty) {
      await AuthStorage.instance.setSession(
        token: token,
        email: user.email,
        name: user.name,
        phone: user.phone,
        picture: user.picture,
        role: user.role,
      );
    }
    return user;
  }
}
