import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../app/theme.dart';
import '../../core/cart_store.dart';
import '../../data/models/product.dart';
import 'home_screen.dart';

class ProductCard extends StatelessWidget {
  const ProductCard({super.key, required this.product});
  final Product product;

  @override
  Widget build(BuildContext context) {
    final double? qty = CartStore.instance.qtyOf(product.id);
    final bool inCart = qty != null && qty > 0;
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => context.push('/product/${product.id}'),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Stack(
                children: <Widget>[
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(16)),
                    child: ProductImage(url: product.imageUrl, height: 138),
                  ),
                  Positioned(
                    top: 8,
                    left: 8,
                    child: _Tag(
                      label: 'FRESH TODAY',
                      color: AppColors.freshGreen,
                    ),
                  ),
                  if (inCart)
                    const Positioned(
                      top: 8,
                      right: 8,
                      child: _Tag(
                        label: 'IN CART',
                        color: AppColors.brandRed,
                      ),
                    ),
                ],
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 10, 10, 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      product.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'per ${product.unit}',
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.textMuted,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: <Widget>[
                        Expanded(
                          child: Text(
                            product.hasPrice
                                ? '₹${product.price!.toStringAsFixed(0)}'
                                : '—',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        _AddOrStepper(product: product),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag({required this.label, required this.color});
  final String label;
  final Color color;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 9.5,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.4,
        ),
      ),
    );
  }
}

class _AddOrStepper extends StatelessWidget {
  const _AddOrStepper({required this.product});
  final Product product;

  @override
  Widget build(BuildContext context) {
    final double? qty = CartStore.instance.qtyOf(product.id);
    if (qty == null || qty <= 0) {
      return SizedBox(
        height: 32,
        child: ElevatedButton(
          onPressed: product.hasPrice
              ? () => CartStore.instance.addOrIncrement(product)
              : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.brandRed,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            minimumSize: const Size(0, 32),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          child: const Text('ADD',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
        ),
      );
    }
    return Container(
      height: 32,
      decoration: BoxDecoration(
        color: AppColors.brandRed,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          _stepBtn(
            icon: LucideIcons.minus,
            onTap: () => CartStore.instance.decrement(product.id),
          ),
          SizedBox(
            width: 32,
            child: Text(
              qty.toStringAsFixed(qty.truncateToDouble() == qty ? 0 : 1),
              textAlign: TextAlign.center,
              style: const TextStyle(
                  color: Colors.white, fontWeight: FontWeight.w800),
            ),
          ),
          _stepBtn(
            icon: LucideIcons.plus,
            onTap: () => CartStore.instance.addOrIncrement(product),
          ),
        ],
      ),
    );
  }

  Widget _stepBtn({required IconData icon, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      child: SizedBox(
        width: 28,
        height: 32,
        child: Icon(icon, color: Colors.white, size: 16),
      ),
    );
  }
}
