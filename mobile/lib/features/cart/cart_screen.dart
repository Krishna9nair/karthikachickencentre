import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../app/theme.dart';
import '../../core/cart_store.dart';
import '../../data/models/cart_item.dart';
import '../home/home_screen.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: CartStore.instance,
      builder: (BuildContext context, _) {
        final List<CartLine> lines = CartStore.instance.lines;
        return Scaffold(
          appBar: AppBar(
            title: const Text('Your Cart'),
            actions: <Widget>[
              if (lines.isNotEmpty)
                IconButton(
                  tooltip: 'Empty cart',
                  icon: const Icon(LucideIcons.trash2),
                  onPressed: () => _confirmClear(context),
                ),
            ],
          ),
          body: lines.isEmpty
              ? _buildEmpty(context)
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                  itemCount: lines.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (BuildContext c, int i) =>
                      _CartTile(line: lines[i]),
                ),
          bottomNavigationBar: lines.isEmpty
              ? null
              : SafeArea(
                  child: Container(
                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      border: Border(top: BorderSide(color: AppColors.border)),
                    ),
                    child: Row(
                      children: <Widget>[
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: <Widget>[
                              const Text('Subtotal',
                                  style: TextStyle(
                                      color: AppColors.textMuted, fontSize: 12)),
                              Text(
                                '₹${CartStore.instance.total.toStringAsFixed(0)}',
                                style: const TextStyle(
                                    fontSize: 22,
                                    fontWeight: FontWeight.w800),
                              ),
                            ],
                          ),
                        ),
                        FilledButton.icon(
                          onPressed: () => context.push('/checkout'),
                          icon: const Icon(LucideIcons.arrowRight),
                          label: const Text('Checkout'),
                        ),
                      ],
                    ),
                  ),
                ),
        );
      },
    );
  }

  Widget _buildEmpty(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          const Icon(LucideIcons.shoppingBag,
              size: 56, color: AppColors.textMuted),
          const SizedBox(height: 12),
          const Text('Your cart is empty',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: 4),
          const Text('Hand-cut chicken is just a tap away.',
              style: TextStyle(color: AppColors.textMuted)),
          const SizedBox(height: 18),
          FilledButton(
            onPressed: () => context.go('/home'),
            child: const Text('Browse menu'),
          ),
        ],
      ),
    );
  }

  void _confirmClear(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (BuildContext c) => AlertDialog(
        title: const Text('Empty cart?'),
        content: const Text('All items will be removed.'),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(c).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              CartStore.instance.clear();
              Navigator.of(c).pop();
            },
            child: const Text('Empty'),
          ),
        ],
      ),
    );
  }
}

class _CartTile extends StatelessWidget {
  const _CartTile({required this.line});
  final CartLine line;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: <Widget>[
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: SizedBox(
              width: 64,
              height: 64,
              child: ProductImage(url: line.imageUrl, height: 64),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(line.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                Text(
                  '₹${line.price.toStringAsFixed(0)} / ${line.unit}',
                  style:
                      const TextStyle(color: AppColors.textMuted, fontSize: 12),
                ),
                const SizedBox(height: 6),
                Row(
                  children: <Widget>[
                    _stepBtn(
                      icon: LucideIcons.minus,
                      onTap: () =>
                          CartStore.instance.decrement(line.productId),
                    ),
                    SizedBox(
                      width: 40,
                      child: Text(
                        line.qty.toStringAsFixed(
                            line.qty.truncateToDouble() == line.qty ? 0 : 1),
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                    _stepBtn(
                      icon: LucideIcons.plus,
                      onTap: () => CartStore.instance
                          .setQty(line.productId, line.qty + 0.5),
                    ),
                    const Spacer(),
                    Text(
                      '₹${line.lineTotal.toStringAsFixed(0)}',
                      style: const TextStyle(
                          fontWeight: FontWeight.w800, fontSize: 15),
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

  Widget _stepBtn({required IconData icon, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: 28,
        height: 28,
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.border),
          borderRadius: BorderRadius.circular(8),
        ),
        alignment: Alignment.center,
        child: Icon(icon, size: 14),
      ),
    );
  }
}
