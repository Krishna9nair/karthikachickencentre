import 'package:dio/dio.dart';

import '../../core/api_client.dart';
import '../../core/cart_store.dart';
import '../models/cart_item.dart';
import '../models/order.dart';

class OrdersRepository {
  OrdersRepository._();
  static final OrdersRepository instance = OrdersRepository._();
  final Dio _dio = ApiClient.instance.dio;

  /// `status` is one of {ongoing, delivered, cancelled} or null for all.
  Future<List<CustomerOrder>> list({String? status}) async {
    final Response<dynamic> r = await _dio.get<dynamic>(
      '/api/customer/orders',
      queryParameters: <String, dynamic>{
        if (status != null && status.isNotEmpty) 'status': status,
      },
    );
    if (r.statusCode == 401) return <CustomerOrder>[];
    final dynamic data = r.data;
    if (data is! Map) return <CustomerOrder>[];
    final List<dynamic> raw = (data['orders'] as List<dynamic>?) ?? <dynamic>[];
    return raw
        .whereType<Map<dynamic, dynamic>>()
        .map((Map<dynamic, dynamic> j) =>
            CustomerOrder.fromJson(Map<String, dynamic>.from(j)))
        .toList();
  }

  Future<void> cancel(String orderId, {String? reason}) async {
    final Response<dynamic> r = await _dio.post<dynamic>(
      '/api/customer/orders/$orderId/cancel',
      data: <String, dynamic>{if (reason != null) 'reason': reason},
    );
    if ((r.statusCode ?? 500) >= 400) {
      final dynamic data = r.data;
      throw DioException(
        requestOptions: r.requestOptions,
        response: r,
        type: DioExceptionType.badResponse,
        message: data is Map ? (data['detail']?.toString() ?? 'Cancel failed') : 'Cancel failed',
      );
    }
  }

  Future<Map<String, dynamic>> placeCodOrder({
    required String name,
    required String phone,
    required String address,
    required List<CartLine> items,
    required double totalAmount,
    required String slotDate,
    required String slotStart,
    required String slotEnd,
    required String slotLabel,
    String? notes,
    String? couponCode,
    bool applyFirstOrderDiscount = false,
    double? lat,
    double? lng,
  }) async {
    final Response<dynamic> r = await _dio.post<dynamic>(
      '/api/orders/cod',
      data: _buildCreateOrderPayload(
        name: name,
        phone: phone,
        address: address,
        items: items,
        totalAmount: totalAmount,
        slotDate: slotDate,
        slotStart: slotStart,
        slotEnd: slotEnd,
        slotLabel: slotLabel,
        notes: notes,
        couponCode: couponCode,
        applyFirstOrderDiscount: applyFirstOrderDiscount,
        lat: lat,
        lng: lng,
      ),
    );
    _ensureOk(r);
    return Map<String, dynamic>.from(r.data as Map<dynamic, dynamic>);
  }

  /// Step 1 of Razorpay flow: create the order (server-side) so we get a
  /// `razorpay_order_id` to feed into the native checkout SDK.
  Future<Map<String, dynamic>> createPaymentOrder({
    required String name,
    required String phone,
    required String address,
    required List<CartLine> items,
    required double totalAmount,
    required String slotDate,
    required String slotStart,
    required String slotEnd,
    required String slotLabel,
    String? notes,
    String? couponCode,
    bool applyFirstOrderDiscount = false,
    double? lat,
    double? lng,
  }) async {
    final Response<dynamic> r = await _dio.post<dynamic>(
      '/api/payments/create-order',
      data: _buildCreateOrderPayload(
        name: name,
        phone: phone,
        address: address,
        items: items,
        totalAmount: totalAmount,
        slotDate: slotDate,
        slotStart: slotStart,
        slotEnd: slotEnd,
        slotLabel: slotLabel,
        notes: notes,
        couponCode: couponCode,
        applyFirstOrderDiscount: applyFirstOrderDiscount,
        lat: lat,
        lng: lng,
      ),
    );
    _ensureOk(r);
    return Map<String, dynamic>.from(r.data as Map<dynamic, dynamic>);
  }

  /// Step 2 of Razorpay flow: hand the SDK's response back to the backend so
  /// it verifies the signature and inserts the order.
  Future<Map<String, dynamic>> verifyPayment({
    required String localOrderId,
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
  }) async {
    final Response<dynamic> r = await _dio.post<dynamic>(
      '/api/payments/verify',
      data: <String, dynamic>{
        'local_order_id': localOrderId,
        'razorpay_order_id': razorpayOrderId,
        'razorpay_payment_id': razorpayPaymentId,
        'razorpay_signature': razorpaySignature,
      },
    );
    _ensureOk(r);
    return Map<String, dynamic>.from(r.data as Map<dynamic, dynamic>);
  }

  Map<String, dynamic> _buildCreateOrderPayload({
    required String name,
    required String phone,
    required String address,
    required List<CartLine> items,
    required double totalAmount,
    required String slotDate,
    required String slotStart,
    required String slotEnd,
    required String slotLabel,
    String? notes,
    String? couponCode,
    bool applyFirstOrderDiscount = false,
    double? lat,
    double? lng,
  }) =>
      <String, dynamic>{
        'customer_name': name,
        'customer_phone': phone,
        'customer_address': address,
        if (lat != null) 'delivery_lat': lat,
        if (lng != null) 'delivery_lng': lng,
        'items': items.map((CartLine l) => l.toApiJson()).toList(),
        'total_amount': totalAmount,
        if ((notes ?? '').isNotEmpty) 'notes': notes,
        'apply_first_order_discount': applyFirstOrderDiscount,
        if ((couponCode ?? '').isNotEmpty) 'coupon_code': couponCode,
        'delivery_slot_date': slotDate,
        'delivery_slot_start': slotStart,
        'delivery_slot_end': slotEnd,
        'delivery_slot_label': slotLabel,
      };

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

/// Convenience helper used by Reorder.
List<CartLine> orderItemsToCartLines(List<OrderItem> items) {
  return items
      .map((OrderItem o) => CartLine(
            productId: o.productId,
            name: o.name,
            unit: 'kg',
            qty: o.qty,
            price: o.price,
          ))
      .toList();
}
