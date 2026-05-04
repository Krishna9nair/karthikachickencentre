class CustomerAddress {
  CustomerAddress({
    required this.id,
    required this.label,
    required this.address,
    this.lat,
    this.lng,
    this.isDefault = false,
  });

  final String id;
  final String label;
  final String address;
  final double? lat;
  final double? lng;
  final bool isDefault;

  factory CustomerAddress.fromJson(Map<String, dynamic> j) => CustomerAddress(
        id: (j['id'] ?? '').toString(),
        label: (j['label'] ?? 'Home').toString(),
        address: (j['address'] ?? '').toString(),
        lat: j['lat'] is num ? (j['lat'] as num).toDouble() : null,
        lng: j['lng'] is num ? (j['lng'] as num).toDouble() : null,
        isDefault: j['is_default'] == true,
      );

  Map<String, dynamic> toUpdateJson({
    String? label,
    String? address,
    double? lat,
    double? lng,
    bool? isDefault,
  }) =>
      <String, dynamic>{
        'label': label ?? this.label,
        'address': address ?? this.address,
        'lat': lat ?? this.lat,
        'lng': lng ?? this.lng,
        'is_default': isDefault ?? this.isDefault,
      };
}
