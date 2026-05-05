class CustomerReview {
  CustomerReview({
    required this.id,
    required this.name,
    required this.rating,
    required this.comment,
    required this.createdAt,
  });

  final String id;
  final String name;
  final int rating;
  final String comment;
  final DateTime createdAt;

  factory CustomerReview.fromJson(Map<String, dynamic> j) => CustomerReview(
        id: (j['id'] ?? '').toString(),
        name: (j['name'] ?? '').toString(),
        rating: (j['rating'] as num? ?? 0).toInt(),
        comment: (j['comment'] ?? '').toString(),
        createdAt:
            DateTime.tryParse(j['created_at']?.toString() ?? '') ??
                DateTime.now(),
      );
}
