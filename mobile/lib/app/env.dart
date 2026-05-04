import 'package:flutter_dotenv/flutter_dotenv.dart';

class Env {
  Env._();

  static String get apiBaseUrl {
    final String fromEnv = dotenv.maybeGet('API_BASE_URL') ?? '';
    if (fromEnv.isNotEmpty) return fromEnv;
    return 'https://karthikachickencentre.shop';
  }

  static String get appName {
    final String n = dotenv.maybeGet('APP_NAME') ?? '';
    return n.isEmpty ? 'Karthika Chicken Centre' : n;
  }

  static const String adminEmail = 'knair9843@gmail.com';
  static const String shopWhatsApp = '919619417452';
}
