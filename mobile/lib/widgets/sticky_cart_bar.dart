import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../app/theme.dart';
import '../../core/cart_store.dart';

/// Swiggy-style sticky cart bar shown at the bottom of [HomeScreen]. Hidden
/// when cart is empty.
class StickyCartBar extends StatelessWidget {
  const StickyCartBar({super.key});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: CartStore.instance,
      builder: (BuildContext context, _) {
        if (CartStore.instance.isEmpty) return const SizedBox.shrink();
        return SafeArea(
          minimum: const EdgeInsets.fromLTRB(12, 0, 12, 12),
          child: GestureDetector(
            onTap: () => context.go('/cart'),
            child: Container(
              height: 56,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: AppColors.brandRed,
                borderRadius: BorderRadius.circular(14),
                boxShadow: <BoxShadow>[
                  BoxShadow(
                    color: AppColors.brandRed.withValues(alpha: 0.35),
                    blurRadius: 22,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Row(
                children: <Widget>[
                  Text(
                    '${CartStore.instance.distinctCount} items',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const Text(' • ',
                      style: TextStyle(color: Colors.white)),
                  Text(
                    '₹${CartStore.instance.total.toStringAsFixed(0)}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const Spacer(),
                  const Text('View cart',
                      style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700)),
                  const SizedBox(width: 4),
                  const Icon(LucideIcons.arrowRight,
                      color: Colors.white, size: 18),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
