import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';

import '../../app/theme.dart';
import '../../core/api_client.dart';
import '../../core/auth_storage.dart';
import '../../core/cart_store.dart';
import '../../data/models/address.dart';
import '../../data/models/cart_item.dart';
import '../../data/models/order.dart';
import '../../data/repositories/orders_repository.dart';
import '../../data/repositories/products_repository.dart';
import '../../data/repositories/profile_repository.dart';
import 'save_address_prompt.dart';

/// Args passed via go_router `extra` from CheckoutScreen → BillScreen.
class BillNavArgs {
  const BillNavArgs({
    required this.orderId,
    required this.customerName,
    required this.customerPhone,
    required this.customerAddress,
    required this.items,
    required this.totalAmount,
    required this.paymentMethod,
    this.grossSubtotal,
    this.discount = 0,
    this.firstOrderDiscountApplied = false,
    this.couponCode,
    this.deliverySlotDate,
    this.deliverySlotLabel,
    this.deliveryFee = 0,
  });
  final String orderId;
  final String customerName;
  final String customerPhone;
  final String customerAddress;
  final List<CartLine> items;
  final double totalAmount;
  final String paymentMethod;
  final double? grossSubtotal;
  final double discount;
  final bool firstOrderDiscountApplied;
  final String? couponCode;
  final String? deliverySlotDate;
  final String? deliverySlotLabel;
  final double deliveryFee;
}

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});
  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final TextEditingController _name = TextEditingController();
  final TextEditingController _phone = TextEditingController();
  final TextEditingController _address = TextEditingController();
  final TextEditingController _notes = TextEditingController();
  final TextEditingController _coupon = TextEditingController();
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();

  List<DeliverySlot> _slots = <DeliverySlot>[];
  DeliverySlot? _selectedSlot;
  List<CustomerAddress> _savedAddresses = <CustomerAddress>[];
  bool _loadingSlots = true;
  bool _busy = false;
  bool _firstOrderEligible = false;
  double _couponDiscount = 0;
  String? _couponCode;
  String? _couponError;
  String _payMethod = 'cod'; // 'cod' or 'razorpay'
  String? _error;

  Razorpay? _razorpay;

  @override
  void initState() {
    super.initState();
    _seedFromStorage();
    _loadSlots();
    _loadAddresses();
    _setupRazorpay();
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _address.dispose();
    _notes.dispose();
    _coupon.dispose();
    _razorpay?.clear();
    super.dispose();
  }

  void _seedFromStorage() {
    _name.text = AuthStorage.instance.name ?? '';
    _phone.text = AuthStorage.instance.phone ?? '';
  }

  Future<void> _loadSlots() async {
    try {
      final List<DeliverySlot> slots =
          await ProductsRepository.instance.slotAvailability();
      // Drop past slots for today.
      final DateTime now = DateTime.now();
      final String today =
          '${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
      final List<DeliverySlot> filtered = slots.where((DeliverySlot s) {
        if (s.full) return false;
        if (s.date == today) {
          final List<String> parts = s.start.split(':');
          final DateTime slotStart = DateTime(now.year, now.month, now.day,
              int.parse(parts[0]), int.parse(parts[1]));
          // 30-min cutoff
          return slotStart.isAfter(now.add(const Duration(minutes: 30)));
        }
        return true;
      }).toList();
      if (!mounted) return;
      setState(() {
        _slots = filtered;
        _selectedSlot = filtered.isEmpty ? null : filtered.first;
        _loadingSlots = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadingSlots = false;
        _error = ApiClient.describeError(e);
      });
    }
  }

  Future<void> _loadAddresses() async {
    if (!AuthStorage.instance.isAuthenticated) return;
    try {
      final List<CustomerAddress> list =
          await ProfileRepository.instance.listAddresses();
      if (!mounted) return;
      setState(() {
        _savedAddresses = list;
        if (_address.text.isEmpty && list.isNotEmpty) {
          final CustomerAddress def = list.firstWhere(
            (CustomerAddress a) => a.isDefault,
            orElse: () => list.first,
          );
          _address.text = def.address;
        }
      });
    } catch (_) {/* silent */}
  }

  Future<void> _checkFirstOrder() async {
    final String phone = _phone.text.replaceAll(RegExp(r'\D'), '');
    if (phone.length < 10) {
      setState(() => _firstOrderEligible = false);
      return;
    }
    final bool eligible =
        await ProductsRepository.instance.firstOrderEligible(phone);
    if (!mounted) return;
    setState(() => _firstOrderEligible = eligible);
  }

  Future<void> _validateCoupon() async {
    final String code = _coupon.text.trim();
    if (code.isEmpty) {
      setState(() {
        _couponDiscount = 0;
        _couponCode = null;
        _couponError = null;
      });
      return;
    }
    try {
      final Map<String, dynamic> result =
          await ProductsRepository.instance.validateCoupon(
        code: code,
        itemsTotal: _itemsTotal,
        phone: _phone.text.replaceAll(RegExp(r'\D'), ''),
      );
      if (!mounted) return;
      if (result['valid'] == true) {
        setState(() {
          _couponDiscount = (result['discount'] as num? ?? 0).toDouble();
          _couponCode = code;
          _couponError = null;
        });
      } else {
        setState(() {
          _couponDiscount = 0;
          _couponCode = null;
          _couponError = (result['error'] ?? 'Invalid coupon').toString();
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _couponDiscount = 0;
        _couponCode = null;
        _couponError = ApiClient.describeError(e);
      });
    }
  }

  double get _itemsTotal => CartStore.instance.total;

  double get _firstOrderDiscount =>
      _firstOrderEligible ? (_itemsTotal * 0.10).roundToDouble() : 0;

  /// Server picks the bigger of the two — so we mirror that here for the UI.
  double get _appliedDiscount =>
      _firstOrderDiscount > _couponDiscount ? _firstOrderDiscount : _couponDiscount;

  double get _payable {
    final double net = _itemsTotal - _appliedDiscount;
    return net < 0 ? 0 : net;
  }

  void _setupRazorpay() {
    _razorpay = Razorpay()
      ..on(Razorpay.EVENT_PAYMENT_SUCCESS, _onRzpSuccess)
      ..on(Razorpay.EVENT_PAYMENT_ERROR, _onRzpError)
      ..on(Razorpay.EVENT_EXTERNAL_WALLET, _onRzpExternal);
  }

  Future<void> _placeOrder() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedSlot == null) {
      setState(() => _error = 'Please pick a delivery slot.');
      return;
    }
    if (CartStore.instance.isEmpty) {
      setState(() => _error = 'Your cart is empty.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (_payMethod == 'cod') {
        await _placeCod();
      } else {
        await _startRazorpay();
      }
    } catch (e) {
      setState(() => _error = ApiClient.describeError(e));
    } finally {
      if (mounted && _payMethod == 'cod') setState(() => _busy = false);
    }
  }

  Future<void> _placeCod() async {
    // Snapshot cart BEFORE clearing — we need them for the bill screen.
    final List<CartLine> snapshotItems =
        List<CartLine>.from(CartStore.instance.lines);
    final Map<String, dynamic> resp =
        await OrdersRepository.instance.placeCodOrder(
      name: _name.text.trim(),
      phone: _phone.text.replaceAll(RegExp(r'\D'), ''),
      address: _address.text.trim(),
      items: CartStore.instance.lines,
      totalAmount: _payable,
      slotDate: _selectedSlot!.date,
      slotStart: _selectedSlot!.start,
      slotEnd: _selectedSlot!.end,
      slotLabel: _selectedSlot!.label,
      notes: _notes.text.trim(),
      couponCode: _couponCode,
      applyFirstOrderDiscount: _firstOrderEligible,
    );
    final dynamic order = resp['order'];
    final String? orderId = order is Map ? order['id']?.toString() : null;
    if (!mounted) return;
    CartStore.instance.clear();
    await _onOrderPlaced(
      orderId: orderId,
      items: snapshotItems,
      paymentMethod: 'cod',
    );
  }

  Future<void> _startRazorpay() async {
    final Map<String, dynamic> resp =
        await OrdersRepository.instance.createPaymentOrder(
      name: _name.text.trim(),
      phone: _phone.text.replaceAll(RegExp(r'\D'), ''),
      address: _address.text.trim(),
      items: CartStore.instance.lines,
      totalAmount: _payable,
      slotDate: _selectedSlot!.date,
      slotStart: _selectedSlot!.start,
      slotEnd: _selectedSlot!.end,
      slotLabel: _selectedSlot!.label,
      notes: _notes.text.trim(),
      couponCode: _couponCode,
      applyFirstOrderDiscount: _firstOrderEligible,
    );
    final String? rzpOrderId = resp['razorpay_order_id']?.toString();
    final String? key = resp['razorpay_key_id']?.toString();
    final int amount = (resp['amount'] as num? ?? 0).toInt();
    final String localId = resp['local_order_id']?.toString() ?? '';
    if (rzpOrderId == null || key == null || localId.isEmpty) {
      throw Exception('Could not initiate payment.');
    }
    _pendingLocalOrderId = localId;
    final Map<String, dynamic> options = <String, dynamic>{
      'key': key,
      'order_id': rzpOrderId,
      'amount': amount,
      'currency': 'INR',
      'name': 'Karthika Chicken Centre',
      'description': 'Fresh chicken delivery',
      'prefill': <String, String>{
        'contact': _phone.text,
        'name': _name.text,
      },
      'theme': <String, String>{'color': '#D32F2F'},
    };
    _razorpay!.open(options);
  }

  String? _pendingLocalOrderId;

  Future<void> _onRzpSuccess(PaymentSuccessResponse r) async {
    // Snapshot cart BEFORE clearing — needed for bill screen.
    final List<CartLine> snapshotItems =
        List<CartLine>.from(CartStore.instance.lines);
    try {
      final Map<String, dynamic> resp =
          await OrdersRepository.instance.verifyPayment(
        localOrderId: _pendingLocalOrderId ?? '',
        razorpayOrderId: r.orderId ?? '',
        razorpayPaymentId: r.paymentId ?? '',
        razorpaySignature: r.signature ?? '',
      );
      final dynamic order = resp['order'];
      final String? orderId = order is Map ? order['id']?.toString() : null;
      if (!mounted) return;
      CartStore.instance.clear();
      setState(() => _busy = false);
      await _onOrderPlaced(
        orderId: orderId,
        items: snapshotItems,
        paymentMethod: 'razorpay',
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = 'Payment verification failed: ${ApiClient.describeError(e)}';
      });
    }
  }

  void _onRzpError(PaymentFailureResponse r) {
    if (!mounted) return;
    setState(() {
      _busy = false;
      _error = 'Payment cancelled: ${r.message ?? 'unknown reason'}';
    });
  }

  void _onRzpExternal(ExternalWalletResponse r) {
    if (!mounted) return;
    setState(() => _busy = false);
  }

  Future<void> _onOrderPlaced({
    required String? orderId,
    required List<CartLine> items,
    required String paymentMethod,
  }) async {
    if (orderId == null) {
      // No order ID returned — show a generic success and bail.
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Order placed!')),
      );
      context.go('/orders');
      return;
    }
    // Offer to save the address for next time (only signed-in + linked-phone).
    await SaveAddressPrompt.showIfRelevant(
      context,
      address: _address.text.trim(),
    );
    if (!mounted) return;
    // Push the bill screen and clear the checkout from the back stack.
    context.pushReplacement(
      '/bill',
      extra: BillNavArgs(
        orderId: orderId,
        customerName: _name.text.trim(),
        customerPhone: _phone.text.replaceAll(RegExp(r'\D'), ''),
        customerAddress: _address.text.trim(),
        items: items,
        totalAmount: _payable,
        paymentMethod: paymentMethod,
        grossSubtotal: _itemsTotal,
        discount: _appliedDiscount,
        firstOrderDiscountApplied: _firstOrderDiscount > 0 &&
            _firstOrderDiscount >= _couponDiscount,
        couponCode: _couponCode,
        deliverySlotDate: _selectedSlot?.date,
        deliverySlotLabel: _selectedSlot?.label,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            children: <Widget>[
              _section('Delivery details'),
              TextFormField(
                controller: _name,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(
                  labelText: 'Full name',
                  prefixIcon: Icon(LucideIcons.user),
                ),
                validator: (String? v) => (v == null || v.trim().length < 2)
                    ? 'Enter your name'
                    : null,
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                onChanged: (_) => _checkFirstOrder(),
                decoration: const InputDecoration(
                  labelText: '10-digit phone',
                  prefixIcon: Icon(LucideIcons.phone),
                ),
                validator: (String? v) {
                  final String d = (v ?? '').replaceAll(RegExp(r'\D'), '');
                  return d.length < 10 ? 'Enter a valid phone' : null;
                },
              ),
              const SizedBox(height: 10),
              if (_savedAddresses.isNotEmpty) _buildAddressPicker(),
              TextFormField(
                controller: _address,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Delivery address',
                  prefixIcon: Icon(LucideIcons.mapPin),
                  ),
                  validator: (String? v) => (v == null || v.trim().length < 5)
                      ? 'Enter a valid address'
                      : null,
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _notes,
                  decoration: const InputDecoration(
                    labelText: 'Notes (optional)',
                    prefixIcon: Icon(LucideIcons.stickyNote),
                  ),
                ),
                const SizedBox(height: 20),
                _section('Delivery slot'),
                if (_loadingSlots)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 16),
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (_slots.isEmpty)
                  const Text('No slots available right now. Please try later.')
                else
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _slots
                        .map((DeliverySlot s) => _buildSlotChip(s))
                        .toList(),
                  ),
                const SizedBox(height: 20),
                _section('Have a coupon?'),
                Row(
                  children: <Widget>[
                    Expanded(
                      child: TextFormField(
                        controller: _coupon,
                        textCapitalization: TextCapitalization.characters,
                        decoration: InputDecoration(
                          hintText: 'WELCOME20',
                          errorText: _couponError,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton(
                      onPressed: _validateCoupon,
                      child: const Text('Apply'),
                    ),
                  ],
                ),
                if (_couponDiscount > 0)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      'Coupon $_couponCode applied (–₹${_couponDiscount.toStringAsFixed(0)})',
                      style: const TextStyle(color: AppColors.success),
                    ),
                  ),
                const SizedBox(height: 24),
                _section('Payment'),
                _buildPaymentOption('cod', 'Cash on Delivery', LucideIcons.banknote),
                const SizedBox(height: 8),
                _buildPaymentOption('razorpay', 'UPI / Card / Net banking',
                    LucideIcons.creditCard),
                const SizedBox(height: 24),
                _buildSummary(),
                if (_error != null) ...<Widget>[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.danger.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(_error!,
                        style: const TextStyle(color: AppColors.danger)),
                  ),
                ],
              ],
            ),
          ),
        ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: AppColors.border)),
          ),
          child: FilledButton.icon(
            onPressed: _busy ? null : _placeOrder,
            icon: _busy
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        color: Colors.white, strokeWidth: 2),
                  )
                : const Icon(LucideIcons.checkCircle),
            label: Text(
              _busy
                  ? 'Placing…'
                  : _payMethod == 'cod'
                      ? 'Place order  •  ₹${_payable.toStringAsFixed(0)}'
                      : 'Pay  •  ₹${_payable.toStringAsFixed(0)}',
            ),
          ),
        ),
      ),
    );
  }

  Widget _section(String title) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(title,
            style: Theme.of(context).textTheme.titleMedium),
      );

  Widget _buildAddressPicker() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: _savedAddresses.map((CustomerAddress a) {
          final bool selected = _address.text == a.address;
          return ChoiceChip(
            label: Text('${a.label} • ${a.address.length > 20 ? '${a.address.substring(0, 20)}…' : a.address}'),
            selected: selected,
            selectedColor: AppColors.brandRed.withValues(alpha: 0.12),
            onSelected: (_) => setState(() => _address.text = a.address),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildSlotChip(DeliverySlot s) {
    final bool selected = _selectedSlot?.start == s.start && _selectedSlot?.date == s.date;
    final DateTime today = DateTime.now();
    final String todayStr =
        '${today.year.toString().padLeft(4, '0')}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';
    final String dayLabel = s.date == todayStr ? 'Today' : 'Tomorrow';
    return ChoiceChip(
      label: Text('$dayLabel • ${s.label}'),
      selected: selected,
      selectedColor: AppColors.brandRed.withValues(alpha: 0.12),
      onSelected: (_) => setState(() => _selectedSlot = s),
    );
  }

  Widget _buildPaymentOption(String value, String label, IconData icon) {
    final bool selected = _payMethod == value;
    return InkWell(
      onTap: () => setState(() => _payMethod = value),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.brandRed.withValues(alpha: 0.06)
              : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? AppColors.brandRed : AppColors.border,
            width: selected ? 1.6 : 1,
          ),
        ),
        child: Row(
          children: <Widget>[
            Icon(icon, color: selected ? AppColors.brandRed : AppColors.textPrimary),
            const SizedBox(width: 10),
            Expanded(
              child: Text(label,
                  style: const TextStyle(fontWeight: FontWeight.w600)),
            ),
            Radio<String>(
              value: value,
              groupValue: _payMethod,
              activeColor: AppColors.brandRed,
              onChanged: (String? v) => setState(() => _payMethod = v ?? 'cod'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummary() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceAlt,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: <Widget>[
          _row('Items total', '₹${_itemsTotal.toStringAsFixed(0)}'),
          if (_appliedDiscount > 0)
            _row('Discount', '–₹${_appliedDiscount.toStringAsFixed(0)}',
                color: AppColors.success),
          const Divider(),
          _row('To pay', '₹${_payable.toStringAsFixed(0)}', bold: true),
        ],
      ),
    );
  }

  Widget _row(String l, String r, {bool bold = false, Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: <Widget>[
          Expanded(
              child: Text(l,
                  style: TextStyle(
                      color: color, fontWeight: bold ? FontWeight.w800 : null))),
          Text(r,
              style: TextStyle(
                  color: color, fontWeight: bold ? FontWeight.w800 : null)),
        ],
      ),
    );
  }
}
