import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/auth_storage.dart';
import '../features/auth/forgot_password_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/reset_password_screen.dart';
import '../features/auth/signup_screen.dart';
import '../features/cart/cart_screen.dart';
import '../features/checkout/checkout_screen.dart';
import '../features/home/home_screen.dart';
import '../features/legal/legal_screen.dart';
import '../features/orders/order_detail_screen.dart';
import '../features/orders/orders_screen.dart';
import '../features/product/product_detail_screen.dart';
import '../features/profile/addresses_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/shell/home_shell.dart';
import '../features/splash/splash_screen.dart';

final GlobalKey<NavigatorState> _rootKey = GlobalKey<NavigatorState>();
final GlobalKey<NavigatorState> _shellKey = GlobalKey<NavigatorState>();

/// Global router. Refreshes whenever the auth token changes so redirects
/// take effect after sign-in / sign-out.
final Provider<GoRouter> routerProvider = Provider<GoRouter>((Ref ref) {
  final ValueNotifier<String?> tokenNotifier =
      AuthStorage.instance.tokenListenable;
  return GoRouter(
    navigatorKey: _rootKey,
    initialLocation: '/',
    refreshListenable: tokenNotifier,
    routes: <RouteBase>[
      GoRoute(
        path: '/',
        name: 'splash',
        builder: (BuildContext c, GoRouterState s) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (BuildContext c, GoRouterState s) => const LoginScreen(),
        routes: <RouteBase>[
          GoRoute(
            path: 'signup',
            name: 'signup',
            builder: (BuildContext c, GoRouterState s) => const SignupScreen(),
          ),
          GoRoute(
            path: 'forgot',
            name: 'forgot',
            builder: (BuildContext c, GoRouterState s) =>
                const ForgotPasswordScreen(),
          ),
          GoRoute(
            path: 'reset',
            name: 'reset',
            builder: (BuildContext c, GoRouterState s) {
              final String token = s.uri.queryParameters['token'] ?? '';
              return ResetPasswordScreen(token: token);
            },
          ),
        ],
      ),
      ShellRoute(
        navigatorKey: _shellKey,
        builder: (BuildContext context, GoRouterState state, Widget child) {
          return HomeShell(child: child);
        },
        routes: <RouteBase>[
          GoRoute(
            path: '/home',
            name: 'home',
            pageBuilder: (BuildContext c, GoRouterState s) =>
                const NoTransitionPage<void>(child: HomeScreen()),
          ),
          GoRoute(
            path: '/cart',
            name: 'cart',
            pageBuilder: (BuildContext c, GoRouterState s) =>
                const NoTransitionPage<void>(child: CartScreen()),
          ),
          GoRoute(
            path: '/orders',
            name: 'orders',
            pageBuilder: (BuildContext c, GoRouterState s) =>
                const NoTransitionPage<void>(child: OrdersScreen()),
          ),
          GoRoute(
            path: '/profile',
            name: 'profile',
            pageBuilder: (BuildContext c, GoRouterState s) =>
                const NoTransitionPage<void>(child: ProfileScreen()),
          ),
        ],
      ),
      GoRoute(
        parentNavigatorKey: _rootKey,
        path: '/product/:id',
        name: 'product',
        builder: (BuildContext c, GoRouterState s) =>
            ProductDetailScreen(productId: s.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        parentNavigatorKey: _rootKey,
        path: '/checkout',
        name: 'checkout',
        builder: (BuildContext c, GoRouterState s) => const CheckoutScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootKey,
        path: '/orders/:id',
        name: 'order-detail',
        builder: (BuildContext c, GoRouterState s) =>
            OrderDetailScreen(orderId: s.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        parentNavigatorKey: _rootKey,
        path: '/profile/addresses',
        name: 'addresses',
        builder: (BuildContext c, GoRouterState s) => const AddressesScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootKey,
        path: '/legal/:slug',
        name: 'legal',
        builder: (BuildContext c, GoRouterState s) => LegalScreen(
          slug: s.pathParameters['slug'] ?? 'terms',
        ),
      ),
    ],
  );
});
