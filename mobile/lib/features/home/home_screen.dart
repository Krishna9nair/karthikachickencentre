import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:shimmer/shimmer.dart';

import '../../app/theme.dart';
import '../../core/api_client.dart';
import '../../core/auth_storage.dart';
import '../../core/cart_store.dart';
import '../../data/models/product.dart';
import '../../data/repositories/products_repository.dart';
import '../../widgets/sticky_cart_bar.dart';
import 'product_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<Product>? _products;
  String? _error;
  Timer? _refreshTimer;
  String _shopNotice = '';

  @override
  void initState() {
    super.initState();
    _load();
    _refreshTimer = Timer.periodic(const Duration(minutes: 1), (_) => _load(silent: true));
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) setState(() => _error = null);
    try {
      final List<Product> list = await ProductsRepository.instance.list();
      // Shop notice (best-effort).
      ProductsRepository.instance.shopInfo().then((Map<String, dynamic> info) {
        if (!mounted) return;
        setState(() => _shopNotice = (info['notice'] ?? '').toString());
      }).catchError((_) {});
      if (!mounted) return;
      setState(() => _products = list);
    } catch (e) {
      if (!mounted) return;
      if (!silent) setState(() => _error = ApiClient.describeError(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: CartStore.instance,
      builder: (BuildContext context, _) {
        return Stack(
          children: <Widget>[
            RefreshIndicator(
              color: AppColors.brandRed,
              onRefresh: _load,
              child: CustomScrollView(
                slivers: <Widget>[
                  SliverAppBar(
                    pinned: true,
                    elevation: 0,
                    backgroundColor: AppColors.surface,
                    surfaceTintColor: AppColors.surface,
                    title: Row(
                      children: <Widget>[
                        Container(
                          width: 28,
                          height: 28,
                          decoration: const BoxDecoration(
                            color: AppColors.brandRed,
                            shape: BoxShape.circle,
                          ),
                          alignment: Alignment.center,
                          child: const Text('🐔',
                              style: TextStyle(fontSize: 16)),
                        ),
                        const SizedBox(width: 8),
                        const Flexible(
                          child: Text('Karthika Chicken Centre',
                              overflow: TextOverflow.ellipsis),
                        ),
                      ],
                    ),
                    actions: <Widget>[
                      if (!AuthStorage.instance.isAuthenticated)
                        TextButton(
                          onPressed: () => context.push('/login'),
                          child: const Text('Sign in'),
                        ),
                    ],
                  ),
                  SliverToBoxAdapter(child: _buildHero()),
                  if (_shopNotice.isNotEmpty)
                    SliverToBoxAdapter(child: _buildNotice()),
                  SliverPadding(
                    padding:
                        const EdgeInsets.fromLTRB(16, 20, 16, 8),
                    sliver: SliverToBoxAdapter(
                      child: _buildSectionHeader(),
                    ),
                  ),
                  if (_error != null)
                    SliverToBoxAdapter(child: _buildError())
                  else if (_products == null)
                    _buildSkeleton()
                  else if (_products!.isEmpty)
                    const SliverToBoxAdapter(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child: Center(child: Text('No products available.')),
                      ),
                    )
                  else
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
                      sliver: SliverGrid(
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          mainAxisSpacing: 14,
                          crossAxisSpacing: 14,
                          childAspectRatio: 0.62,
                        ),
                        delegate: SliverChildBuilderDelegate(
                          (BuildContext c, int i) =>
                              ProductCard(product: _products![i]),
                          childCount: _products!.length,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: StickyCartBar(),
            ),
          ],
        );
      },
    );
  }

  Widget _buildHero() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 22),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: <Color>[AppColors.brandRed, Color(0xFFE53935)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: AppColors.brandRed.withValues(alpha: 0.25),
            blurRadius: 22,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const Text(
            'Fresh Chicken\nDelivered to Your Door',
            style: TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w800,
              height: 1.2,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Hygienic • Never frozen • Same-day',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.95),
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: <Widget>[
              _trustChip(LucideIcons.shieldCheck, '100% Hygienic'),
              _trustChip(LucideIcons.snowflake, 'Never Frozen'),
              _trustChip(LucideIcons.truck, 'Same-day'),
              _trustChip(LucideIcons.badgeCheck, 'FSSAI'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _trustChip(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Icon(icon, size: 14, color: Colors.white),
          const SizedBox(width: 6),
          Text(label,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Widget _buildNotice() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.warning.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.warning.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: <Widget>[
          const Icon(LucideIcons.megaphone,
              size: 18, color: AppColors.warning),
          const SizedBox(width: 8),
          Expanded(child: Text(_shopNotice)),
        ],
      ),
    );
  }

  Widget _buildSectionHeader() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: <Widget>[
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text("Today's Cuts",
                  style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 2),
              const Text('Fresh stock, live prices',
                  style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
            ],
          ),
        ),
        IconButton(
          onPressed: _load,
          icon: const Icon(LucideIcons.refreshCw, size: 18),
          tooltip: 'Refresh',
        ),
      ],
    );
  }

  Widget _buildError() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: <Widget>[
          const Icon(LucideIcons.wifiOff, size: 40, color: AppColors.textMuted),
          const SizedBox(height: 8),
          Text(_error ?? 'Could not load products.',
              textAlign: TextAlign.center),
          const SizedBox(height: 12),
          OutlinedButton(onPressed: _load, child: const Text('Retry')),
        ],
      ),
    );
  }

  Widget _buildSkeleton() {
    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
      sliver: SliverGrid(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 14,
          crossAxisSpacing: 14,
          childAspectRatio: 0.62,
        ),
        delegate: SliverChildBuilderDelegate(
          (BuildContext c, int i) => Shimmer.fromColors(
            baseColor: const Color(0xFFEEEEEE),
            highlightColor: const Color(0xFFF7F7F7),
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.surfaceAlt,
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
          childCount: 6,
        ),
      ),
    );
  }
}

/// Reused by Product Detail and Cart for fast tile thumbnails.
class ProductImage extends StatelessWidget {
  const ProductImage({super.key, required this.url, this.height = 120});
  final String? url;
  final double height;

  @override
  Widget build(BuildContext context) {
    if (url == null || url!.isEmpty) {
      return Container(
        height: height,
        color: AppColors.surfaceAlt,
        alignment: Alignment.center,
        child: const Icon(LucideIcons.image, color: AppColors.textMuted),
      );
    }
    return CachedNetworkImage(
      imageUrl: url!,
      height: height,
      fit: BoxFit.cover,
      placeholder: (BuildContext c, _) => Container(
        height: height,
        color: AppColors.surfaceAlt,
      ),
      errorWidget: (BuildContext c, _, __) => Container(
        height: height,
        color: AppColors.surfaceAlt,
        alignment: Alignment.center,
        child: const Icon(LucideIcons.imageOff, color: AppColors.textMuted),
      ),
    );
  }
}
