import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../app/theme.dart';
import '../../core/cart_store.dart';

/// Bottom-tab shell with Home / Cart / Orders / Profile. Lives inside the
/// GoRouter ShellRoute so each tab keeps its own scroll position.
class HomeShell extends StatelessWidget {
  const HomeShell({super.key, required this.child});
  final Widget child;

  static const List<_TabItem> _tabs = <_TabItem>[
    _TabItem(label: 'Home', path: '/home', icon: LucideIcons.home),
    _TabItem(label: 'Cart', path: '/cart', icon: LucideIcons.shoppingBag),
    _TabItem(label: 'Orders', path: '/orders', icon: LucideIcons.clipboardList),
    _TabItem(label: 'Profile', path: '/profile', icon: LucideIcons.user),
  ];

  int _currentIndex(String location) {
    for (int i = 0; i < _tabs.length; i++) {
      if (location.startsWith(_tabs[i].path)) return i;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final String location = GoRouterState.of(context).uri.path;
    final int currentIdx = _currentIndex(location);
    return Scaffold(
      body: child,
      bottomNavigationBar: AnimatedBuilder(
        animation: CartStore.instance,
        builder: (BuildContext context, _) {
          return BottomNavigationBar(
            currentIndex: currentIdx,
            onTap: (int i) => context.go(_tabs[i].path),
            items: <BottomNavigationBarItem>[
              for (int i = 0; i < _tabs.length; i++)
                BottomNavigationBarItem(
                  icon: i == 1 ? _CartIcon(icon: _tabs[i].icon) : Icon(_tabs[i].icon),
                  activeIcon: i == 1
                      ? _CartIcon(icon: _tabs[i].icon, active: true)
                      : Icon(_tabs[i].icon, color: AppColors.brandRed),
                  label: _tabs[i].label,
                ),
            ],
          );
        },
      ),
    );
  }
}

class _TabItem {
  const _TabItem({required this.label, required this.path, required this.icon});
  final String label;
  final String path;
  final IconData icon;
}

class _CartIcon extends StatelessWidget {
  const _CartIcon({required this.icon, this.active = false});
  final IconData icon;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final int count = CartStore.instance.distinctCount;
    return Stack(
      clipBehavior: Clip.none,
      children: <Widget>[
        Icon(icon, color: active ? AppColors.brandRed : null),
        if (count > 0)
          Positioned(
            right: -8,
            top: -6,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(
                color: AppColors.brandRed,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.white, width: 1.5),
              ),
              constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
              child: Text(
                '$count',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
      ],
    );
  }
}
