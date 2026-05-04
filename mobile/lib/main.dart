import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/router.dart';
import 'app/theme.dart';
import 'core/api_client.dart';
import 'core/auth_storage.dart';
import 'core/cart_store.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations(<DeviceOrientation>[
    DeviceOrientation.portraitUp,
  ]);
  // Load environment variables (asset bundled via pubspec).
  try {
    await dotenv.load(fileName: '.env');
  } catch (_) {
    // .env is optional in release; defaults are baked into ApiClient.
  }
  // Warm up the auth + cart stores so the first frame already has state.
  await AuthStorage.instance.load();
  await CartStore.instance.load();
  // ApiClient reads the persisted token on first lazy access.
  ApiClient.instance.bootstrap();
  runApp(const ProviderScope(child: ChickenCrewApp()));
}

class ChickenCrewApp extends ConsumerWidget {
  const ChickenCrewApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final GoRouter router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: dotenv.env['APP_NAME'] ?? 'Karthika Chicken Centre',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: router,
    );
  }
}
