import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../app/theme.dart';

/// Red conversion banner shown right above the Reviews section.
/// Mirrors `FinalCTA.jsx` from the website.
class FinalCtaSection extends StatelessWidget {
  const FinalCtaSection({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 28, 16, 0),
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 22),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: <Color>[Color(0xFFD32F2F), Color(0xFFB71C1C)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: AppColors.brandRed.withValues(alpha: 0.25),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: <Widget>[
          const Text(
            'Hungry yet?',
            style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w800,
                fontSize: 22),
          ),
          const SizedBox(height: 6),
          Text(
            'Same-day delivery. Hand-cut. Hygienic. Never frozen.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.95),
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 14),
          FilledButton.icon(
            onPressed: () => context.go('/cart'),
            icon: const Icon(LucideIcons.shoppingBag, color: AppColors.brandRed),
            label: const Text('Order Now',
                style: TextStyle(color: AppColors.brandRed)),
            style: FilledButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: AppColors.brandRed,
              minimumSize: const Size(0, 46),
              padding: const EdgeInsets.symmetric(horizontal: 24),
            ),
          ),
        ],
      ),
    );
  }
}
