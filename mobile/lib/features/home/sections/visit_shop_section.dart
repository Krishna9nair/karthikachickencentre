import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/env.dart';
import '../../../app/theme.dart';
import '../../../data/repositories/products_repository.dart';

/// Mirrors `VisitShop.jsx` — shows shop address, hours, and Call/WhatsApp
/// buttons. Tapping the address opens Google Maps in the user's default
/// maps app (native intent handler).
class VisitShopSection extends StatefulWidget {
  const VisitShopSection({super.key});
  @override
  State<VisitShopSection> createState() => _VisitShopSectionState();
}

class _VisitShopSectionState extends State<VisitShopSection> {
  String _shopName = 'Karthika Chicken Centre';
  String _address = 'Trimurti Nagar, Dombivli East, Thane, Maharashtra 421201';
  String _phoneDigits = '9619417452';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final Map<String, dynamic> info =
          await ProductsRepository.instance.shopInfo();
      if (!mounted) return;
      setState(() {
        if (info['shop_name'] != null) _shopName = info['shop_name'].toString();
        if (info['address'] != null) _address = info['address'].toString();
        if (info['contact_phone'] != null) {
          _phoneDigits = info['contact_phone']
              .toString()
              .replaceAll(RegExp(r'\D'), '');
        }
      });
    } catch (_) {/* keep fallbacks */}
  }

  String get _e164 =>
      _phoneDigits.length == 10 ? '91$_phoneDigits' : _phoneDigits;

  Future<void> _openMaps() async {
    final String q = Uri.encodeComponent('$_shopName, $_address');
    final Uri uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=$q');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _call() async {
    final Uri uri = Uri.parse('tel:+$_e164');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _whatsapp() async {
    final String msg = Uri.encodeComponent(
        'Hi! I want to place an order from ${Env.appName}.');
    final Uri uri = Uri.parse('https://wa.me/$_e164?text=$msg');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 28, 16, 0),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceAlt,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const Text(
            'VISIT THE SHOP',
            style: TextStyle(
              fontSize: 11,
              letterSpacing: 2.5,
              fontWeight: FontWeight.w800,
              color: AppColors.brandRed,
            ),
          ),
          const SizedBox(height: 6),
          Text('Walk in if you’re close',
              style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 14),
          // "Map preview" — tappable card that launches Google Maps.
          InkWell(
            onTap: _openMaps,
            borderRadius: BorderRadius.circular(12),
            child: Container(
              height: 130,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Stack(
                children: <Widget>[
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: <Color>[
                            const Color(0xFFE8F5E9),
                            const Color(0xFFFFEBEE).withValues(alpha: 0.7),
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      alignment: Alignment.center,
                      child: const Icon(LucideIcons.mapPin,
                          color: AppColors.brandRed, size: 36),
                    ),
                  ),
                  Positioned(
                    left: 10,
                    right: 10,
                    bottom: 10,
                    child: Row(
                      children: <Widget>[
                        const Expanded(
                          child: Text(
                            'Tap to open in Google Maps',
                            style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                                shadows: <Shadow>[
                                  Shadow(color: Colors.black54, blurRadius: 4)
                                ]),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: <Widget>[
                              Icon(LucideIcons.navigation,
                                  color: AppColors.brandRed, size: 12),
                              SizedBox(width: 4),
                              Text('Directions',
                                  style: TextStyle(
                                      color: AppColors.brandRed,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 11)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Row(
                  children: <Widget>[
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: AppColors.brandRed.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      alignment: Alignment.center,
                      child: const Icon(LucideIcons.mapPin,
                          color: AppColors.brandRed, size: 18),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: <Widget>[
                          Text(_shopName,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w800, fontSize: 15)),
                          const SizedBox(height: 2),
                          Text(_address,
                              style:
                                  const TextStyle(color: AppColors.textPrimary)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: <Widget>[
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: AppColors.surfaceAlt,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      alignment: Alignment.center,
                      child: const Icon(LucideIcons.clock,
                          color: AppColors.textMuted, size: 18),
                    ),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: <Widget>[
                          Text('OPEN HOURS',
                              style: TextStyle(
                                  fontSize: 10,
                                  color: AppColors.textMuted,
                                  letterSpacing: 1.2,
                                  fontWeight: FontWeight.w800)),
                          Text('Mon–Sun · 8:00 AM – 9:00 PM',
                              style: TextStyle(fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Row(
                  children: <Widget>[
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: _call,
                        icon: const Icon(LucideIcons.phone),
                        label: const Text('Call'),
                        style: FilledButton.styleFrom(
                          minimumSize: const Size(0, 44),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: _whatsapp,
                        icon: const Icon(LucideIcons.messageCircle),
                        label: const Text('WhatsApp'),
                        style: FilledButton.styleFrom(
                          minimumSize: const Size(0, 44),
                          backgroundColor: const Color(0xFF25D366),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
