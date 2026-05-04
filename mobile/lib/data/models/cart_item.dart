/// One line item in the local cart. Matches the backend's expected shape for
/// `CreateOrderIn.items` exactly so we can serialize and POST without
/// remapping at checkout time.
class CartLine {
  CartLine({
    required this.productId,
    required this.name,
    required this.unit,
    required this.qty,
    required this.price,
    this.imageUrl,
  });

  final String productId;
  final String name;
  final String unit;
  final double qty;
  final double price;
  final String? imageUrl;

  double get lineTotal => qty * price;

  CartLine copyWith({double? qty, double? price}) => CartLine(
        productId: productId,
        name: name,
        unit: unit,
        qty: qty ?? this.qty,
        price: price ?? this.price,
        imageUrl: imageUrl,
      );

  /// Wire format for the backend `CartItem` model.
  Map<String, dynamic> toApiJson() => <String, dynamic>{
        'product_id': productId,
        'name': name,
        'qty': qty,
        'price': price,
      };

  Map<String, dynamic> toJson() => <String, dynamic>{
        'product_id': productId,
        'name': name,
        'unit': unit,
        'qty': qty,
        'price': price,
        'image_url': imageUrl,
      };

  factory CartLine.fromJson(Map<String, dynamic> json) => CartLine(
        productId: (json['product_id'] ?? '').toString(),
        name: (json['name'] ?? '').toString(),
        unit: (json['unit'] ?? 'kg').toString(),
        qty: (json['qty'] as num? ?? 0).toDouble(),
        price: (json['price'] as num? ?? 0).toDouble(),
        imageUrl: json['image_url']?.toString(),
      );
}
