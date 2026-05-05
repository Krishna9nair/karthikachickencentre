import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';

import '../app/env.dart';

/// Mirrors the website's `FloatingActions.jsx` — a circular green
/// WhatsApp button that opens chat with the shop. Sits above the sticky
/// cart bar on the Home screen.
class FloatingWhatsAppFab extends StatelessWidget {
  const FloatingWhatsAppFab({super.key, this.bottomOffset = 76});
  final double bottomOffset;

  Future<void> _open() async {
    final String msg = Uri.encodeComponent(
        'Hi! I want to place an order from ${Env.appName}.');
    final Uri uri = Uri.parse('https://wa.me/${Env.shopWhatsApp}?text=$msg');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    return Positioned(
      right: 16,
      bottom: bottomOffset,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: _open,
          customBorder: const CircleBorder(),
          child: Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: const Color(0xFF25D366),
              shape: BoxShape.circle,
              boxShadow: <BoxShadow>[
                BoxShadow(
                  color: const Color(0xFF25D366).withValues(alpha: 0.45),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: const Icon(LucideIcons.messageCircle,
                color: Colors.white, size: 26),
          ),
        ),
      ),
    );
  }
}
