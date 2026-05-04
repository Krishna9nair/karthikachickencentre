import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../app/theme.dart';
import '../../core/cart_store.dart';
import '../../data/models/product.dart';
import '../../data/repositories/products_repository.dart';
import '../home/home_screen.dart';

class ProductDetailScreen extends StatefulWidget {
  const ProductDetailScreen({super.key, required this.productId});
  final String productId;
  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  Product? _product;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      // Prefer the dedicated single-product endpoint; fall back to the
      // full list if the dedicated route isn't deployed yet.
      Product? match = await ProductsRepository.instance.get(widget.productId);
      match ??= (await ProductsRepository.instance.list()).firstWhere(
        (Product p) => p.id == widget.productId,
        orElse: () => throw StateError('Product not found'),
      );
      if (!mounted) return;
      setState(() {
        _product = match;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: AnimatedBuilder(
        animation: CartStore.instance,
        builder: (BuildContext context, _) => SafeArea(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? _buildError()
                  : _buildContent(),
        ),
      ),
      bottomNavigationBar: _product == null ? null : _buildBottomBar(),
    );
  }

  Widget _buildError() => Padding(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              const Icon(LucideIcons.alertTriangle, size: 40),
              const SizedBox(height: 8),
              Text(_error ?? 'Failed to load.', textAlign: TextAlign.center),
              const SizedBox(height: 12),
              OutlinedButton(onPressed: _load, child: const Text('Retry')),
            ],
          ),
        ),
      );

  Widget _buildContent() {
    final Product p = _product!;
    return CustomScrollView(
      slivers: <Widget>[
        SliverAppBar(
          expandedHeight: 280,
          pinned: true,
          backgroundColor: AppColors.surface,
          surfaceTintColor: AppColors.surface,
          foregroundColor: AppColors.textPrimary,
          leading: IconButton(
            icon: const Icon(LucideIcons.arrowLeft),
            onPressed: () => context.pop(),
          ),
          flexibleSpace: FlexibleSpaceBar(
            background: ProductImage(url: p.imageUrl, height: 280),
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
          sliver: SliverList(
            delegate: SliverChildListDelegate(<Widget>[
              Text(p.name,
                  style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 6),
              Text('per ${p.unit}',
                  style: const TextStyle(color: AppColors.textMuted)),
              const SizedBox(height: 14),
              Row(
                children: <Widget>[
                  Text(
                    p.hasPrice ? '₹${p.price!.toStringAsFixed(0)}' : '—',
                    style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.freshGreen,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text('FRESH TODAY',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w800)),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Text('Description',
                  style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 6),
              Text(
                p.description?.isNotEmpty == true
                    ? p.description!
                    : 'Hand-cut today by our local butcher. Cleaned, packed, and '
                        'delivered cold within hours of slaughter — never frozen.',
                style: const TextStyle(height: 1.5),
              ),
              const SizedBox(height: 24),
              const _TrustRow(),
            ]),
          ),
        ),
      ],
    );
  }

  Widget _buildBottomBar() {
    final Product p = _product!;
    final double? qty = CartStore.instance.qtyOf(p.id);
    final bool inCart = qty != null && qty > 0;
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: Row(
          children: <Widget>[
            if (inCart)
              _StepperPill(productId: p.id, qty: qty)
            else
              Expanded(
                child: FilledButton.icon(
                  onPressed: p.hasPrice
                      ? () => CartStore.instance.addOrIncrement(p)
                      : null,
                  icon: const Icon(LucideIcons.shoppingBag),
                  label: const Text('Add to cart'),
                ),
              ),
            if (inCart) const SizedBox(width: 12),
            if (inCart)
              Expanded(
                child: FilledButton(
                  onPressed: () => context.go('/cart'),
                  child: const Text('Go to cart'),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _StepperPill extends StatelessWidget {
  const _StepperPill({required this.productId, required this.qty});
  final String productId;
  final double qty;
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 50,
      padding: const EdgeInsets.symmetric(horizontal: 6),
      decoration: BoxDecoration(
        color: AppColors.brandRed,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: <Widget>[
          IconButton(
            onPressed: () => CartStore.instance.decrement(productId),
            icon: const Icon(LucideIcons.minus, color: Colors.white),
          ),
          SizedBox(
            width: 56,
            child: Text(
              qty.toStringAsFixed(qty.truncateToDouble() == qty ? 0 : 1),
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w800,
                fontSize: 16,
              ),
            ),
          ),
          IconButton(
            onPressed: () {
              final CartStore s = CartStore.instance;
              final double? cur = s.qtyOf(productId);
              if (cur != null) s.setQty(productId, cur + 0.5);
            },
            icon: const Icon(LucideIcons.plus, color: Colors.white),
          ),
        ],
      ),
    );
  }
}

class _TrustRow extends StatelessWidget {
  const _TrustRow();
  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 16,
      runSpacing: 12,
      children: const <Widget>[
        _TrustPoint(icon: LucideIcons.shieldCheck, label: '100% Hygienic'),
        _TrustPoint(icon: LucideIcons.snowflake, label: 'Never Frozen'),
        _TrustPoint(icon: LucideIcons.truck, label: 'Same-day delivery'),
        _TrustPoint(icon: LucideIcons.badgeCheck, label: 'FSSAI certified'),
      ],
    );
  }
}

class _TrustPoint extends StatelessWidget {
  const _TrustPoint({required this.icon, required this.label});
  final IconData icon;
  final String label;
  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        Icon(icon, color: AppColors.brandRed, size: 18),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
      ],
    );
  }
}
