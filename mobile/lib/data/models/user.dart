class AppUser {
  AppUser({
    required this.email,
    this.name,
    this.phone,
    this.picture,
    this.role = 'customer',
  });

  final String email;
  final String? name;
  final String? phone;
  final String? picture;
  final String role;

  bool get hasLinkedPhone => (phone ?? '').length >= 10;

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        email: (json['email'] ?? '').toString(),
        name: json['name']?.toString(),
        phone: json['phone']?.toString(),
        picture: json['picture']?.toString(),
        role: (json['role'] ?? 'customer').toString(),
      );
}
