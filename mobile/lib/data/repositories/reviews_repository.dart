import 'package:dio/dio.dart';

import '../../core/api_client.dart';
import '../models/review.dart';

class ReviewsRepository {
  ReviewsRepository._();
  static final ReviewsRepository instance = ReviewsRepository._();
  final Dio _dio = ApiClient.instance.dio;

  Future<List<CustomerReview>> list() async {
    try {
      final Response<dynamic> r =
          await _dio.get<dynamic>('/api/public/reviews');
      final dynamic data = r.data;
      if (data is! Map) return <CustomerReview>[];
      final List<dynamic> raw =
          (data['reviews'] as List<dynamic>?) ?? <dynamic>[];
      return raw
          .whereType<Map<dynamic, dynamic>>()
          .map((Map<dynamic, dynamic> j) =>
              CustomerReview.fromJson(Map<String, dynamic>.from(j)))
          .toList();
    } catch (_) {
      return <CustomerReview>[];
    }
  }

  /// Submit a new review. Backend always inserts with `is_approved=false`,
  /// so it won't appear publicly until the shop approves it.
  Future<void> submit({
    required String name,
    required int rating,
    required String comment,
    String? phone,
    String? orderId,
  }) async {
    final Response<dynamic> r = await _dio.post<dynamic>(
      '/api/reviews',
      data: <String, dynamic>{
        'name': name,
        'rating': rating,
        'comment': comment,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
        if (orderId != null && orderId.isNotEmpty) 'order_id': orderId,
      },
    );
    final int code = r.statusCode ?? 0;
    if (code >= 200 && code < 300) return;
    final dynamic data = r.data;
    String detail = 'Could not save review';
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
