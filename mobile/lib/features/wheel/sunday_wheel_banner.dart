import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../app/theme.dart';
import 'sunday_wheel_dialog.dart';

/// Mirrors `SundayWheelBanner.jsx`. Always visible at the top of Home —
/// the dialog itself decides whether the wheel is spinnable today.
class SundayWheelBanner extends StatelessWidget {
  const SundayWheelBanner({super.key});

  static bool get _isSundayIst {
    final DateTime nowUtc = DateTime.now().toUtc();
    final DateTime ist = nowUtc.add(const Duration(hours: 5, minutes: 30));
    return ist.weekday == DateTime.sunday;
  }

  @override
  Widget build(BuildContext context) {
    final bool sunday = _isSundayIst;
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () => showDialog<void>(
            context: context,
            builder: (_) => const SundayWheelDialog(),
          ),
          child: Container(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: <Color>[Color(0xFFD32F2F), Color(0xFFFF7043)],
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
              ),
              borderRadius: BorderRadius.circular(14),
              boxShadow: <BoxShadow>[
                BoxShadow(
                  color: AppColors.brandRed.withValues(alpha: 0.25),
                  blurRadius: 14,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Row(
              children: <Widget>[
                const Text('🎡', style: TextStyle(fontSize: 24)),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: <Widget>[
                      Text(
                        sunday ? 'Sunday Lucky Spin is LIVE!' : 'Sunday Lucky Spin',
                        style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                            fontSize: 14),
                      ),
                      Text(
                        sunday
                            ? 'Spin to win up to 15% off or ₹75 off'
                            : 'Comes back this Sunday — win up to ₹75 off',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.95),
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(LucideIcons.chevronRight, color: Colors.white),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
