import 'package:dio/dio.dart';

import '../../core/api_client.dart';
import '../models/order.dart';
import '../models/product.dart';

class ProductsRepository {
  ProductsRepository._();
  static final ProductsRepository instance = ProductsRepository._();
  final Dio _dio = ApiClient.instance.dio;

  Future<List<Product>> list() async {
    final Response<dynamic> r = await _dio.get<dynamic>('/api/public/products');
    final dynamic data = r.data;
    if (data is! Map) return <Product>[];
    final List<dynamic> raw =
        (data['products'] as List<dynamic>?) ?? <dynamic>[];
    return raw
        .whereType<Map<dynamic, dynamic>>()
        .map((Map<dynamic, dynamic> j) =>
            Product.fromJson(Map<String, dynamic>.from(j)))
        .where((Product p) => p.isActive)
        .toList();
  }

  /// Map of {productId -> price} keyed for the "Today's Price" card.
  Future<List<Product>> todayPriceList() async => list();

  /// Single product lookup. Uses the dedicated `/api/products/{id}`
  /// endpoint added 2026-02-13.
  Future<Product?> get(String id) async {
    try {
      final Response<dynamic> r =
          await _dio.get<dynamic>('/api/products/$id');
      if (r.statusCode == 404) return null;
      if (r.data is Map) {
        return Product.fromJson(Map<String, dynamic>.from(r.data as Map<dynamic, dynamic>));
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<List<DeliverySlot>> slotAvailability() async {
    final Response<dynamic> r =
        await _dio.get<dynamic>('/api/public/slot-availability');
    final dynamic data = r.data;
    if (data is! Map) return <DeliverySlot>[];
    final List<dynamic> raw = (data['slots'] as List<dynamic>?) ?? <dynamic>[];
    return raw
        .whereType<Map<dynamic, dynamic>>()
        .map((Map<dynamic, dynamic> j) =>
            DeliverySlot.fromJson(Map<String, dynamic>.from(j)))
        .toList();
  }

  Future<Map<String, dynamic>> shopInfo() async {
    final Response<dynamic> r = await _dio.get<dynamic>('/api/public/shop');
    final dynamic data = r.data;
    if (data is Map) return Map<String, dynamic>.from(data);
    return <String, dynamic>{};
  }

  Future<bool> firstOrderEligible(String phone) async {
    if (phone.length < 10) return false;
    try {
      final Response<dynamic> r = await _dio.get<dynamic>(
        '/api/public/first-order-eligible/$phone',
      );
      final dynamic data = r.data;
      if (data is Map && data['eligible'] == true) return true;
      return false;
    } catch (_) {
      return false;
    }
  }

  Future<Map<String, dynamic>> validateCoupon({
    required String code,
    required double itemsTotal,
    String? phone,
  }) async {
    final Response<dynamic> r = await _dio.post<dynamic>(
      '/api/coupons/validate',
      data: <String, dynamic>{
        'code': code,
        'items_total': itemsTotal,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
      },
    );
    final dynamic data = r.data;
    if (data is Map) return Map<String, dynamic>.from(data);
    return <String, dynamic>{'valid': false, 'discount': 0, 'error': 'Invalid response'};
  }
}
