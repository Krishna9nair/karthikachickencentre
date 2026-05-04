/// Plain data class for a single product card. Mirrors the JSON returned by
/// `GET /api/public/products`.
class Product {
  Product({
    required this.id,
    required this.name,
    required this.unit,
    this.description,
    this.imageUrl,
    this.price,
    this.sortOrder,
    this.isActive = true,
  });

  final String id;
  final String name;
  final String? description;
  final String? imageUrl;
  final String unit;
  final double? price;
  final int? sortOrder;
  final bool isActive;

  bool get hasPrice => price != null && price! > 0;

  factory Product.fromJson(Map<String, dynamic> json) {
    final dynamic priceRaw = json['price'];
    return Product(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      description: json['description']?.toString(),
      imageUrl: json['image_url']?.toString(),
      unit: (json['unit'] ?? 'kg').toString(),
      price: priceRaw == null ? null : (priceRaw as num).toDouble(),
      sortOrder: json['sort_order'] is num ? (json['sort_order'] as num).toInt() : null,
      isActive: json['is_active'] != false,
    );
  }
}
