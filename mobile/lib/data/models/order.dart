/// Mirrors a row from the backend `orders` table as returned by
/// `GET /api/customer/orders`.
class CustomerOrder {
  CustomerOrder({
    required this.id,
    required this.customerName,
    required this.customerPhone,
    required this.totalAmount,
    required this.paymentStatus,
    required this.items,
    required this.createdAt,
    this.customerAddress,
    this.notes,
    this.deliverySlotDate,
    this.deliverySlotStart,
    this.deliverySlotEnd,
    this.cancelledAt,
    this.cancelledBy,
  });

  final String id;
  final String customerName;
  final String customerPhone;
  final String? customerAddress;
  final double totalAmount;
  final String paymentStatus;
  final List<OrderItem> items;
  final DateTime createdAt;
  final String? notes;
  final String? deliverySlotDate;
  final String? deliverySlotStart;
  final String? deliverySlotEnd;
  final DateTime? cancelledAt;
  final String? cancelledBy;

  String get statusLabel {
    switch (paymentStatus.toLowerCase()) {
      case 'cod_pending':
        return 'Pending';
      case 'paid':
        return 'Paid';
      case 'preparing':
        return 'Preparing';
      case 'ready':
        return 'Ready';
      case 'out_for_delivery':
        return 'Out for delivery';
      case 'delivered':
      case 'completed':
        return 'Delivered';
      case 'cancelled':
      case 'canceled':
        return 'Cancelled';
      case 'rejected':
        return 'Rejected';
      default:
        return paymentStatus;
    }
  }

  bool get isOngoing => const <String>{
        'cod_pending',
        'paid',
        'preparing',
        'ready',
        'out_for_delivery',
      }.contains(paymentStatus.toLowerCase());

  bool get isCancellable => const <String>{
        'cod_pending',
        'paid',
        'preparing',
        'ready',
      }.contains(paymentStatus.toLowerCase());

  bool get isCancelled => const <String>{
        'cancelled',
        'canceled',
        'rejected',
      }.contains(paymentStatus.toLowerCase());

  factory CustomerOrder.fromJson(Map<String, dynamic> json) {
    final List<dynamic> rawItems =
        (json['items'] as List<dynamic>?) ?? const <dynamic>[];
    return CustomerOrder(
      id: (json['id'] ?? '').toString(),
      customerName: (json['customer_name'] ?? '').toString(),
      customerPhone: (json['customer_phone'] ?? '').toString(),
      customerAddress: json['customer_address']?.toString(),
      totalAmount: (json['total_amount'] as num? ?? 0).toDouble(),
      paymentStatus: (json['payment_status'] ?? '').toString(),
      notes: json['notes']?.toString(),
      deliverySlotDate: json['delivery_slot_date']?.toString(),
      deliverySlotStart: json['delivery_slot_start']?.toString(),
      deliverySlotEnd: json['delivery_slot_end']?.toString(),
      createdAt: DateTime.tryParse(json['created_at']?.toString() ?? '') ??
          DateTime.now(),
      cancelledAt: json['cancelled_at'] != null
          ? DateTime.tryParse(json['cancelled_at'].toString())
          : null,
      cancelledBy: json['cancelled_by']?.toString(),
      items: rawItems
          .whereType<Map<dynamic, dynamic>>()
          .map((Map<dynamic, dynamic> e) =>
              OrderItem.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
    );
  }
}

class OrderItem {
  OrderItem({
    required this.productId,
    required this.name,
    required this.qty,
    required this.price,
  });

  final String productId;
  final String name;
  final double qty;
  final double price;

  factory OrderItem.fromJson(Map<String, dynamic> j) => OrderItem(
        productId: (j['product_id'] ?? '').toString(),
        name: (j['name'] ?? '').toString(),
        qty: (j['qty'] as num? ?? 0).toDouble(),
        price: (j['price'] as num? ?? 0).toDouble(),
      );
}

/// Backend payload describing a delivery slot capacity row.
class DeliverySlot {
  DeliverySlot({
    required this.date,
    required this.start,
    required this.booked,
    required this.capacity,
    required this.full,
  });

  final String date; // YYYY-MM-DD
  final String start; // HH:MM
  final int booked;
  final int capacity;
  final bool full;

  /// Hardcoded mapping (matches the website's display) — backend only stores
  /// start time so we re-derive end + label here.
  static const Map<String, String> _endByStart = <String, String>{
    '09:00': '11:00',
    '11:00': '13:00',
    '13:00': '15:00',
    '15:00': '17:00',
    '17:00': '19:00',
    '19:00': '21:00',
  };

  String get end => _endByStart[start] ?? start;

  String get label {
    String fmt(String hhmm) {
      final List<String> parts = hhmm.split(':');
      final int h = int.tryParse(parts[0]) ?? 0;
      final String suffix = h >= 12 ? 'PM' : 'AM';
      final int h12 = h == 0 ? 12 : (h > 12 ? h - 12 : h);
      return '$h12 $suffix';
    }

    return '${fmt(start)} – ${fmt(end)}';
  }

  int get remaining => (capacity - booked).clamp(0, capacity);

  factory DeliverySlot.fromJson(Map<String, dynamic> j) => DeliverySlot(
        date: (j['date'] ?? '').toString(),
        start: (j['start'] ?? '').toString(),
        booked: (j['booked'] as num? ?? 0).toInt(),
        capacity: (j['capacity'] as num? ?? 10).toInt(),
        full: j['full'] == true,
      );
}
