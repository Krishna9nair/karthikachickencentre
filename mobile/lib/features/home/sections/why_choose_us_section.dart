import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../app/theme.dart';

/// Mirrors the website's `WhyChooseUs.jsx` — 4 trust pillars stacked
/// in a 2×2 grid with detailed copy.
class WhyChooseUsSection extends StatelessWidget {
  const WhyChooseUsSection({super.key});

  static const List<_Pillar> _pillars = <_Pillar>[
    _Pillar(
      icon: LucideIcons.shieldCheck,
      title: '100% Hygienic',
      body: 'Every cut is cleaned, washed and packed in front of you. '
          'No middlemen, no shortcuts.',
    ),
    _Pillar(
      icon: LucideIcons.snowflake,
      title: 'Never Frozen',
      body: 'We slaughter and dress only what we sell that day. Your '
          'chicken is hours-fresh, never frozen.',
    ),
    _Pillar(
      icon: LucideIcons.truck,
      title: 'Same-day Delivery',
      body: 'Order in the morning, get it for lunch. Order in the '
          'afternoon, get it for dinner.',
    ),
    _Pillar(
      icon: LucideIcons.badgeCheck,
      title: 'FSSAI Certified',
      body: 'Licensed kitchen, food-safety audited. The same butcher '
          'your neighbours trust.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 28, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const Text(
            'WHY CHOOSE US',
            style: TextStyle(
              fontSize: 11,
              letterSpacing: 2.5,
              fontWeight: FontWeight.w800,
              color: AppColors.brandRed,
            ),
          ),
          const SizedBox(height: 6),
          Text('What makes our chicken better',
              style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 14),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 0.92,
            children: _pillars
                .map((_Pillar p) => Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: AppColors.brandRed.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            alignment: Alignment.center,
                            child: Icon(p.icon,
                                color: AppColors.brandRed, size: 20),
                          ),
                          const SizedBox(height: 10),
                          Text(p.title,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w800)),
                          const SizedBox(height: 4),
                          Expanded(
                            child: Text(
                              p.body,
                              style: const TextStyle(
                                  color: AppColors.textMuted,
                                  fontSize: 12,
                                  height: 1.35),
                            ),
                          ),
                        ],
                      ),
                    ))
                .toList(),
          ),
        ],
      ),
    );
  }
}

class _Pillar {
  const _Pillar({required this.icon, required this.title, required this.body});
  final IconData icon;
  final String title;
  final String body;
}
