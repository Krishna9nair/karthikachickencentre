import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../app/theme.dart';
import '../../core/api_client.dart';
import '../../core/cart_store.dart';
import '../../data/models/order.dart';
import '../../data/repositories/orders_repository.dart';

class OrderDetailScreen extends StatefulWidget {
  const OrderDetailScreen({super.key, required this.orderId});
  final String orderId;
  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  CustomerOrder? _order;
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
      final List<CustomerOrder> all =
          await OrdersRepository.instance.list();
      final CustomerOrder match = all.firstWhere(
        (CustomerOrder o) => o.id == widget.orderId,
        orElse: () => throw StateError('Order not found'),
      );
      if (!mounted) return;
      setState(() {
        _order = match;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = ApiClient.describeError(e);
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Order details'),
        actions: <Widget>[
          if (_order != null)
            IconButton(
              icon: const Icon(LucideIcons.refreshCw),
              tooltip: 'Refresh',
              onPressed: _load,
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Padding(
                  padding: const EdgeInsets.all(24),
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: <Widget>[
                        const Icon(LucideIcons.alertTriangle, size: 40),
                        const SizedBox(height: 8),
                        Text(_error ?? 'Failed to load.',
                            textAlign: TextAlign.center),
                        const SizedBox(height: 12),
                        OutlinedButton(
                            onPressed: _load,
                            child: const Text('Retry')),
                      ],
                    ),
                  ),
                )
              : _buildContent(_order!),
    );
  }

  Widget _buildContent(CustomerOrder o) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      children: <Widget>[
        Row(
          children: <Widget>[
            Expanded(
              child: Text(
                'Order #${o.id.substring(0, o.id.length > 8 ? 8 : o.id.length)}',
                style: Theme.of(context).textTheme.titleLarge,
              ),
            ),
            _StatusPill(label: o.statusLabel, status: o.paymentStatus),
          ],
        ),
        const SizedBox(height: 4),
        Text('Placed on ${_fmt(o.createdAt)}',
            style: const TextStyle(color: AppColors.textMuted)),
        const SizedBox(height: 16),
        _Timeline(status: o.paymentStatus),
        const SizedBox(height: 24),
        _Section(
          title: 'Delivery',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(o.customerName,
                  style: const TextStyle(fontWeight: FontWeight.w700)),
              Text(o.customerPhone),
              const SizedBox(height: 4),
              Text(o.customerAddress ?? '—'),
              if (o.deliverySlotStart != null) ...<Widget>[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: <Widget>[
                      const Icon(LucideIcons.clock,
                          size: 14, color: AppColors.warning),
                      const SizedBox(width: 6),
                      Text(
                        'Slot: ${o.deliverySlotDate} • ${o.deliverySlotStart}–${o.deliverySlotEnd}',
                        style:
                            const TextStyle(color: AppColors.warning),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        _Section(
          title: 'Items',
          child: Column(
            children: o.items
                .map((OrderItem item) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        children: <Widget>[
                          Expanded(
                            child: Text(
                              '${item.qty.toStringAsFixed(item.qty.truncateToDouble() == item.qty ? 0 : 1)}× ${item.name}',
                            ),
                          ),
                          Text('₹${(item.qty * item.price).toStringAsFixed(0)}'),
                        ],
                      ),
                    ))
                .toList(),
          ),
        ),
        const SizedBox(height: 16),
        _Section(
          title: 'Total',
          child: Row(
            children: <Widget>[
              const Expanded(child: Text('Amount')),
              Text(
                '₹${o.totalAmount.toStringAsFixed(0)}',
                style: const TextStyle(
                    fontWeight: FontWeight.w800, fontSize: 18),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        Row(
          children: <Widget>[
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () {
                  CartStore.instance
                      .replaceWith(orderItemsToCartLines(o.items));
                  context.go('/cart');
                },
                icon: const Icon(LucideIcons.refreshCw),
                label: const Text('Reorder'),
              ),
            ),
            const SizedBox(width: 10),
            if (o.isCancellable)
              Expanded(
                child: FilledButton.icon(
                  onPressed: () => _confirmCancel(context, o.id),
                  icon: const Icon(LucideIcons.x),
                  label: const Text('Cancel'),
                ),
              ),
          ],
        ),
      ],
    );
  }

  Future<void> _confirmCancel(BuildContext context, String id) async {
    final bool? ok = await showDialog<bool>(
      context: context,
      builder: (BuildContext c) => AlertDialog(
        title: const Text('Cancel order?'),
        content: const Text('This cannot be undone.'),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(c).pop(false),
            child: const Text('Keep order'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(c).pop(true),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await OrdersRepository.instance.cancel(id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Order cancelled.')),
      );
      _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ApiClient.describeError(e))),
      );
    }
  }

  String _fmt(DateTime dt) {
    final DateTime local = dt.toLocal();
    return '${local.day}/${local.month}/${local.year} '
        '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});
  final String title;
  final Widget child;
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(title,
              style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.label, required this.status});
  final String label;
  final String status;
  @override
  Widget build(BuildContext context) {
    final Color color = switch (status.toLowerCase()) {
      'cod_pending' || 'paid' || 'preparing' || 'ready' => AppColors.warning,
      'out_for_delivery' => const Color(0xFF2563EB),
      'delivered' || 'completed' => AppColors.success,
      'cancelled' || 'canceled' || 'rejected' => AppColors.danger,
      _ => AppColors.textPrimary,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(label,
          style: TextStyle(color: color, fontWeight: FontWeight.w700)),
    );
  }
}

class _Timeline extends StatelessWidget {
  const _Timeline({required this.status});
  final String status;

  static const List<String> _stages = <String>[
    'cod_pending',
    'preparing',
    'out_for_delivery',
    'delivered',
  ];
  static const List<String> _labels = <String>[
    'Placed',
    'Preparing',
    'Out for delivery',
    'Delivered',
  ];

  int get _stageIdx {
    final String s = status.toLowerCase();
    if (s == 'cancelled' || s == 'canceled' || s == 'rejected') return -1;
    if (s == 'paid' || s == 'cod_pending') return 0;
    if (s == 'preparing' || s == 'ready') return 1;
    if (s == 'out_for_delivery') return 2;
    if (s == 'delivered' || s == 'completed') return 3;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    if (_stageIdx == -1) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.danger.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
        ),
        child: const Row(children: <Widget>[
          Icon(LucideIcons.x, color: AppColors.danger),
          SizedBox(width: 8),
          Text('This order was cancelled.'),
        ]),
      );
    }
    return Column(
      children: List<Widget>.generate(_stages.length, (int i) {
        final bool done = i <= _stageIdx;
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Column(
              children: <Widget>[
                Container(
                  width: 22,
                  height: 22,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: done ? AppColors.brandRed : AppColors.surfaceAlt,
                    border: Border.all(
                      color: done ? AppColors.brandRed : AppColors.border,
                      width: 2,
                    ),
                  ),
                  child: done
                      ? const Icon(LucideIcons.check,
                          size: 12, color: Colors.white)
                      : null,
                ),
                if (i < _stages.length - 1)
                  Container(
                    width: 2,
                    height: 28,
                    color: done && i < _stageIdx
                        ? AppColors.brandRed
                        : AppColors.border,
                  ),
              ],
            ),
            const SizedBox(width: 10),
            Padding(
              padding: const EdgeInsets.only(top: 1),
              child: Text(
                _labels[i],
                style: TextStyle(
                  color: done ? AppColors.textPrimary : AppColors.textMuted,
                  fontWeight: done ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
            ),
          ],
        );
      }),
    );
  }
}
