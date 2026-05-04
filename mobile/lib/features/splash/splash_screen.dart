import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme.dart';
import '../../core/auth_storage.dart';
import '../../data/repositories/auth_repository.dart';

/// Animated logo splash. Fades the brand mark in over the [AppColors.splashRed]
/// background, then routes to /home (always — auth gate is per-screen, not
/// per-route, so the user can browse the catalog without logging in).
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _scale;
  late final Animation<double> _fade;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );
    _scale = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeOutBack),
    );
    _fade = CurvedAnimation(parent: _ctrl, curve: Curves.easeOut);
    _ctrl.forward();
    _kickoff();
  }

  Future<void> _kickoff() async {
    // In parallel: refresh /auth/me if we have a saved token.
    final Future<void> sessionCheck = _silentRefresh();
    // Wait at least 1.6s so the animation reads as intentional.
    await Future.wait<void>(<Future<void>>[
      sessionCheck,
      Future<void>.delayed(const Duration(milliseconds: 1600)),
    ]);
    if (!mounted) return;
    context.go('/home');
  }

  Future<void> _silentRefresh() async {
    if (!AuthStorage.instance.isAuthenticated) return;
    try {
      await AuthRepository.instance.me();
    } catch (_) {/* ignore — handled later */}
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.splashRed,
      body: Center(
        child: FadeTransition(
          opacity: _fade,
          child: ScaleTransition(
            scale: _scale,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Container(
                  width: 132,
                  height: 132,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: <BoxShadow>[
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.25),
                        blurRadius: 24,
                        spreadRadius: 1,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  alignment: Alignment.center,
                  child: const Text(
                    '🐔',
                    style: TextStyle(fontSize: 72),
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Karthika Chicken Centre',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.4,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Fresh chicken delivered to your door',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.9),
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
