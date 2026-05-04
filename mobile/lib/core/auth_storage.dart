import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persistent local storage for the customer session token + linked phone.
/// The same `session_token` cookie that the website's FastAPI backend issues
/// is stored here and sent as `Authorization: Bearer <token>` on every API
/// call (works inside Capacitor / native apps where third-party cookies are
/// blocked).
class AuthStorage {
  AuthStorage._();
  static final AuthStorage instance = AuthStorage._();

  static const String _kToken = 'kc_session_token';
  static const String _kEmail = 'kc_email';
  static const String _kName = 'kc_name';
  static const String _kPhone = 'kc_phone';
  static const String _kPicture = 'kc_picture';
  static const String _kRole = 'kc_role';

  String? _token;
  String? _email;
  String? _name;
  String? _phone;
  String? _picture;
  String? _role;
  bool _loaded = false;

  /// Notifier the GoRouter listens to so redirects trigger on login/logout.
  final ValueNotifier<String?> tokenListenable = ValueNotifier<String?>(null);

  String? get token => _token;
  String? get email => _email;
  String? get name => _name;
  String? get phone => _phone;
  String? get picture => _picture;
  String? get role => _role;
  bool get isAuthenticated => (_token ?? '').isNotEmpty;
  bool get hasLinkedPhone => (_phone ?? '').length >= 10;

  Future<void> load() async {
    if (_loaded) return;
    final SharedPreferences sp = await SharedPreferences.getInstance();
    _token = sp.getString(_kToken);
    _email = sp.getString(_kEmail);
    _name = sp.getString(_kName);
    _phone = sp.getString(_kPhone);
    _picture = sp.getString(_kPicture);
    _role = sp.getString(_kRole);
    _loaded = true;
    tokenListenable.value = _token;
  }

  Future<void> setSession({
    required String token,
    required String email,
    String? name,
    String? phone,
    String? picture,
    String? role,
  }) async {
    final SharedPreferences sp = await SharedPreferences.getInstance();
    _token = token;
    _email = email;
    _name = name ?? '';
    _phone = phone ?? '';
    _picture = picture ?? '';
    _role = role ?? 'customer';
    await sp.setString(_kToken, token);
    await sp.setString(_kEmail, email);
    await sp.setString(_kName, _name ?? '');
    await sp.setString(_kPhone, _phone ?? '');
    await sp.setString(_kPicture, _picture ?? '');
    await sp.setString(_kRole, _role ?? 'customer');
    tokenListenable.value = token;
  }

  Future<void> updateProfile({String? name, String? phone, String? picture}) async {
    final SharedPreferences sp = await SharedPreferences.getInstance();
    if (name != null) {
      _name = name;
      await sp.setString(_kName, name);
    }
    if (phone != null) {
      _phone = phone;
      await sp.setString(_kPhone, phone);
    }
    if (picture != null) {
      _picture = picture;
      await sp.setString(_kPicture, picture);
    }
    // No router-level refresh needed — UI screens that depend on these
    // values manage their own setState() after calling updateProfile.
  }

  Future<void> clear() async {
    final SharedPreferences sp = await SharedPreferences.getInstance();
    _token = null;
    _email = null;
    _name = null;
    _phone = null;
    _picture = null;
    _role = null;
    await sp.remove(_kToken);
    await sp.remove(_kEmail);
    await sp.remove(_kName);
    await sp.remove(_kPhone);
    await sp.remove(_kPicture);
    await sp.remove(_kRole);
    tokenListenable.value = null;
  }
}
