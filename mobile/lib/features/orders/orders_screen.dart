import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../app/theme.dart';
import '../../core/api_client.dart';
import '../../core/auth_storage.dart';
import '../../core/cart_store.dart';
import '../../data/models/order.dart';
import '../../data/repositories/orders_repository.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});
  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  static const List<String> _statuses = <String>[
    'ongoing',
    'delivered',
    'cancelled'
  ];

  Map<String, List<CustomerOrder>?> _byStatus = <String, List<CustomerOrder>?>{
    'ongoing': null,
    'delivered': null,
    'cancelled': null,
  };

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: _statuses.length, vsync: this);
    _refresh();
  }

  Future<void> _refresh() async {
    if (!AuthStorage.instance.isAuthenticated ||
        !AuthStorage.instance.hasLinkedPhone) {
      setState(() => _byStatus = <String, List<CustomerOrder>?>{
            'ongoing': <CustomerOrder>[],
            'delivered': <CustomerOrder>[],
            'cancelled': <CustomerOrder>[],
          });
      return;
    }
    for (final String s in _statuses) {
      try {
        final List<CustomerOrder> list =
            await OrdersRepository.instance.list(status: s);
        if (!mounted) return;
        setState(() => _byStatus[s] = list);
      } catch (_) {
        if (!mounted) return;
        setState(() => _byStatus[s] = <CustomerOrder>[]);
      }
    }
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!AuthStorage.instance.isAuthenticated) {
      return _buildSignInPrompt();
    }
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Orders'),
        bottom: TabBar(
          controller: _tabs,
          labelColor: AppColors.brandRed,
          unselectedLabelColor: AppColors.textMuted,
          indicatorColor: AppColors.brandRed,
          tabs: const <Widget>[
            Tab(text: 'Ongoing'),
            Tab(text: 'Delivered'),
            Tab(text: 'Cancelled'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: _statuses.map(_buildList).toList(),
      ),
    );
  }

  Widget _buildSignInPrompt() {
    return Scaffold(
      appBar: AppBar(title: const Text('My Orders')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              const Icon(LucideIcons.clipboardList,
                  size: 56, color: AppColors.textMuted),
              const SizedBox(height: 12),
              const Text('Sign in to track your orders',
                  style: TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              const Text(
                'Once signed in, your past and live orders show up here.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textMuted),
              ),
              const SizedBox(height: 18),
              FilledButton(
                onPressed: () => context.push('/login'),
                child: const Text('Sign in'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildList(String status) {
    final List<CustomerOrder>? list = _byStatus[status];
    if (list == null) {
      return const Center(child: CircularProgressIndicator());
    }
    if (list.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              const Icon(LucideIcons.inbox,
                  size: 48, color: AppColors.textMuted),
              const SizedBox(height: 8),
              Text('No $status orders yet.'),
              if (!AuthStorage.instance.hasLinkedPhone) ...<Widget>[
                const SizedBox(height: 12),
                const Text(
                  'Link your phone in Profile so past orders show up here.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.textMuted),
                ),
              ],
            ],
          ),
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _refresh,
      color: AppColors.brandRed,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        itemCount: list.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (BuildContext c, int i) =>
            _OrderCard(order: list[i], onChanged: _refresh),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({required this.order, required this.onChanged});
  final CustomerOrder order;
  final Future<void> Function() onChanged;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => context.push('/orders/${order.id}'),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                Expanded(
                  child: Text(
                    'Order #${order.id.substring(0, order.id.length > 8 ? 8 : order.id.length)}',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
                _StatusBadge(status: order.paymentStatus, label: order.statusLabel),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              order.items
                  .map((OrderItem o) =>
                      '${o.qty.toStringAsFixed(o.qty.truncateToDouble() == o.qty ? 0 : 1)}× ${o.name}')
                  .join(', '),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: AppColors.textMuted),
            ),
            const SizedBox(height: 8),
            Row(
              children: <Widget>[
                Text(
                  '₹${order.totalAmount.toStringAsFixed(0)}',
                  style: const TextStyle(
                      fontWeight: FontWeight.w800, fontSize: 16),
                ),
                const Spacer(),
                Text(
                  _formatDate(order.createdAt),
                  style: const TextStyle(
                      color: AppColors.textMuted, fontSize: 12),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: <Widget>[
                OutlinedButton.icon(
                  onPressed: () => _reorder(context),
                  icon: const Icon(LucideIcons.refreshCw, size: 16),
                  label: const Text('Reorder'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(0, 38),
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                  ),
                ),
                const Spacer(),
                if (order.isCancellable)
                  TextButton.icon(
                    onPressed: () => _confirmCancel(context),
                    icon: const Icon(LucideIcons.x,
                        size: 16, color: AppColors.danger),
                    label: const Text('Cancel',
                        style: TextStyle(color: AppColors.danger)),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _reorder(BuildContext context) {
    CartStore.instance.replaceWith(orderItemsToCartLines(order.items));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Cart filled with previous items.')),
    );
    context.go('/cart');
  }

  Future<void> _confirmCancel(BuildContext context) async {
    final bool? ok = await showDialog<bool>(
      context: context,
      builder: (BuildContext c) => AlertDialog(
        title: const Text('Cancel order?'),
        content: const Text(
          'You can cancel only before we start preparing. Continue?',
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(c).pop(false),
            child: const Text('Keep order'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(c).pop(true),
            child: const Text('Cancel order'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await OrdersRepository.instance.cancel(order.id);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Order cancelled.')),
      );
      await onChanged();
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ApiClient.describeError(e))),
      );
    }
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status, required this.label});
  final String status;
  final String label;
  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    switch (status.toLowerCase()) {
      case 'cod_pending':
      case 'paid':
      case 'preparing':
      case 'ready':
        bg = AppColors.warning.withValues(alpha: 0.12);
        fg = AppColors.warning;
        break;
      case 'out_for_delivery':
        bg = const Color(0xFF2563EB).withValues(alpha: 0.12);
        fg = const Color(0xFF2563EB);
        break;
      case 'delivered':
      case 'completed':
        bg = AppColors.success.withValues(alpha: 0.12);
        fg = AppColors.success;
        break;
      case 'cancelled':
      case 'canceled':
      case 'rejected':
        bg = AppColors.danger.withValues(alpha: 0.10);
        fg = AppColors.danger;
        break;
      default:
        bg = AppColors.surfaceAlt;
        fg = AppColors.textPrimary;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: TextStyle(color: fg, fontWeight: FontWeight.w700, fontSize: 11),
      ),
    );
  }
}

String _formatDate(DateTime dt) {
  final DateTime local = dt.toLocal();
  return '${local.day}/${local.month}/${local.year} ${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
}
