import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../app/theme.dart';
import '../../data/models/cart_item.dart';
import '../reviews/write_review_dialog.dart';

/// Mirrors the website's `Bill.jsx`. Full post-order receipt screen with:
///   • Brand header + order id + date
///   • Customer + delivery slot
///   • Items table with rates, qty, line total
///   • Discount lines + delivery fee + grand total
///   • Yellow "Last step" banner pushing the user to alert the shop
///   • WhatsApp shop-alert button (the *primary* CTA after order)
///   • Copy-bill + Print actions
///   • "Got your meat? Leave a review" button
class BillScreen extends StatefulWidget {
  const BillScreen({
    super.key,
    required this.orderId,
    required this.customerName,
    required this.customerPhone,
    required this.customerAddress,
    required this.items,
    required this.totalAmount,
    required this.paymentMethod, // 'cod' or 'razorpay'
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

  /// Single source of truth for the shop owner's WhatsApp number.
  static const String _adminWhatsApp = '919619417452';

  @override
  State<BillScreen> createState() => _BillScreenState();
}

class _BillScreenState extends State<BillScreen> {
  bool _notified = false;
  bool _copied = false;

  String get _shortOrderId => widget.orderId.length >= 8
      ? widget.orderId.substring(0, 8).toUpperCase()
      : widget.orderId.toUpperCase();

  String get _dateStr {
    final DateTime d = DateTime.now();
    const List<String> months = <String>[
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    final String hh = d.hour.toString().padLeft(2, '0');
    final String mm = d.minute.toString().padLeft(2, '0');
    return '${d.day} ${months[d.month - 1]} ${d.year}, $hh:$mm';
  }

  String _formatSlotDate(String? iso) {
    if (iso == null || iso.isEmpty) return '';
    final DateTime? d = DateTime.tryParse('${iso}T00:00:00');
    if (d == null) return iso;
    final DateTime today =
        DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day);
    final int diff = d.difference(today).inDays;
    if (diff == 0) return 'Today';
    if (diff == 1) return 'Tomorrow';
    const List<String> wd = <String>[
      'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
    ];
    const List<String> months = <String>[
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${wd[d.weekday - 1]}, ${d.day} ${months[d.month - 1]}';
  }

  String _buildAdminMessage() {
    final String slotLine = (widget.deliverySlotLabel != null &&
            widget.deliverySlotDate != null)
        ? '\n*Deliver:* ${_formatSlotDate(widget.deliverySlotDate)}, ${widget.deliverySlotLabel}\n'
        : '';
    final String feeLine = widget.deliveryFee > 0
        ? '*Delivery fee:* ₹${widget.deliveryFee.toStringAsFixed(0)}\n'
        : '*Delivery:* FREE\n';
    final String pay = widget.paymentMethod == 'cod'
        ? 'Cash on Delivery'
        : 'Paid online (UPI / Card)';
    final StringBuffer lines = StringBuffer();
    for (final CartLine i in widget.items) {
      final double total = i.qty * i.price;
      lines.writeln(
          '• ${i.name} — ${_fmtQty(i.qty)} ${i.unit} × ₹${i.price.toStringAsFixed(0)}/${i.unit} = ₹${total.toStringAsFixed(0)}');
    }
    return '🐔 *NEW ORDER — Karthika Chicken Centre*\n'
        '\n'
        '*Order ID:* $_shortOrderId\n'
        '*Date:* $_dateStr\n'
        '$slotLine'
        '*Customer:* ${widget.customerName}\n'
        '*Phone:* ${widget.customerPhone}\n'
        '*Address:* ${widget.customerAddress}\n'
        '\n'
        '*Items:*\n'
        '$lines'
        '\n'
        '$feeLine'
        '*Total: ₹${widget.totalAmount.toStringAsFixed(0)}*\n'
        '*Payment:* $pay\n'
        '\n'
        '— sent from karthikachickencentre.shop';
  }

  Future<void> _alertShopOnWhatsApp() async {
    final String url =
        'https://wa.me/${BillScreen._adminWhatsApp}?text=${Uri.encodeComponent(_buildAdminMessage())}';
    await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    if (mounted) setState(() => _notified = true);
  }

  Future<void> _copyBill() async {
    await Clipboard.setData(ClipboardData(text: _buildAdminMessage()));
    if (!mounted) return;
    setState(() => _copied = true);
    Future<void>.delayed(const Duration(milliseconds: 1800), () {
      if (mounted) setState(() => _copied = false);
    });
  }

  Future<void> _leaveReview() async {
    await showDialog<bool>(
      context: context,
      builder: (_) => WriteReviewDialog(
        orderId: widget.orderId,
        prefillName: widget.customerName,
      ),
    );
  }

  String _fmtQty(double q) =>
      q.truncateToDouble() == q ? q.toStringAsFixed(0) : q.toStringAsFixed(1);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Order placed'),
        leading: IconButton(
          icon: const Icon(LucideIcons.x),
          onPressed: () => context.go('/orders'),
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          children: <Widget>[
            _buildHeader(),
            const SizedBox(height: 16),
            _buildReceipt(),
            const SizedBox(height: 16),
            _buildAlertBanner(),
            const SizedBox(height: 12),
            _buildAlertButton(),
            const SizedBox(height: 12),
            Row(
              children: <Widget>[
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _copyBill,
                    icon: Icon(_copied ? LucideIcons.check : LucideIcons.copy,
                        size: 16,
                        color: _copied ? AppColors.success : null),
                    label: Text(_copied ? 'Copied!' : 'Copy bill'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () => context.go('/orders/${widget.orderId}'),
              child: const Text('Track this order'),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: _leaveReview,
              icon: const Icon(Icons.star_rounded,
                  color: Color(0xFFF5A623)),
              label: const Text('Got your meat? Leave a review'),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0xFFF5A623), width: 2),
                backgroundColor: const Color(0xFFFFF7DA),
              ),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => context.go('/home'),
              child: const Text('Back to shop'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      children: <Widget>[
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: AppColors.success.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          alignment: Alignment.center,
          child: const Icon(LucideIcons.checkCircle2,
              color: AppColors.success, size: 36),
        ),
        const SizedBox(height: 10),
        Text('Order placed!',
            style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 4),
        const Text(
          'Your bill is below. Last step — tap the green button to alert '
          'the shop owner on WhatsApp so your order starts being prepared.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.textMuted),
        ),
      ],
    );
  }

  Widget _buildReceipt() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(
            color: AppColors.border,
            width: 2,
            style: BorderStyle.solid),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        children: <Widget>[
          // Brand header
          const Text('Karthika Chicken Centre',
              style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 18)),
          const SizedBox(height: 2),
          const Text('FARM FRESH DAILY',
              style: TextStyle(
                  fontSize: 9,
                  letterSpacing: 2,
                  color: AppColors.textMuted)),
          const SizedBox(height: 4),
          const Text('Trimurti Nagar, Dombivli East · +91 9619417452',
              style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 10),
            child: Divider(height: 1),
          ),
          // Order id + date
          Row(
            children: <Widget>[
              Expanded(
                child: _kv('ORDER ID', _shortOrderId, mono: true),
              ),
              Expanded(
                child: _kv('DATE', _dateStr, alignRight: true),
              ),
            ],
          ),
          const SizedBox(height: 8),
          // Customer block
          Align(
            alignment: Alignment.centerLeft,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                const Text('CUSTOMER',
                    style: TextStyle(
                        fontSize: 10,
                        letterSpacing: 1.2,
                        color: AppColors.textMuted,
                        fontWeight: FontWeight.w800)),
                Text(widget.customerName,
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                Text(widget.customerPhone,
                    style: const TextStyle(color: AppColors.textMuted)),
                Text(widget.customerAddress,
                    style: const TextStyle(
                        color: AppColors.textMuted, fontSize: 12)),
              ],
            ),
          ),
          const SizedBox(height: 10),
          if (widget.deliverySlotLabel != null)
            Container(
              width: double.infinity,
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              margin: const EdgeInsets.only(bottom: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF7DA),
                border: Border.all(color: const Color(0xFFF0DC8A)),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: <Widget>[
                  const Text('DELIVER  ',
                      style: TextStyle(
                          fontSize: 10,
                          letterSpacing: 1.2,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textMuted)),
                  Expanded(
                    child: Text(
                      '${_formatSlotDate(widget.deliverySlotDate)} · ${widget.deliverySlotLabel}',
                      style: const TextStyle(
                          fontWeight: FontWeight.w700, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
          const Divider(height: 1),
          const SizedBox(height: 8),
          // Items table
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Row(
              children: const <Widget>[
                Expanded(
                  flex: 5,
                  child: Text('ITEM',
                      style: TextStyle(
                          fontSize: 9,
                          letterSpacing: 1,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textMuted)),
                ),
                Expanded(
                  flex: 2,
                  child: Text('QTY',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          fontSize: 9,
                          letterSpacing: 1,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textMuted)),
                ),
                Expanded(
                  flex: 3,
                  child: Text('AMT',
                      textAlign: TextAlign.right,
                      style: TextStyle(
                          fontSize: 9,
                          letterSpacing: 1,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textMuted)),
                ),
              ],
            ),
          ),
          ...widget.items.map((CartLine i) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Expanded(
                      flex: 5,
                      child: Text(i.name,
                          style: const TextStyle(fontSize: 12)),
                    ),
                    Expanded(
                      flex: 2,
                      child: Text(
                        '${_fmtQty(i.qty)} ${i.unit}',
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 12),
                      ),
                    ),
                    Expanded(
                      flex: 3,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: <Widget>[
                          Text(
                            '₹${(i.qty * i.price).toStringAsFixed(0)}',
                            style: const TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 12),
                          ),
                          Text('₹${i.price.toStringAsFixed(0)}/${i.unit}',
                              style: const TextStyle(
                                  fontSize: 9, color: AppColors.textMuted)),
                        ],
                      ),
                    ),
                  ],
                ),
              )),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: Divider(height: 1, thickness: 2),
          ),
          // Payment + total
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: <Widget>[
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    const Text('PAYMENT',
                        style: TextStyle(
                            fontSize: 9,
                            letterSpacing: 1,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textMuted)),
                    Text(
                      widget.paymentMethod == 'cod'
                          ? 'Cash on Delivery'
                          : 'Paid online',
                      style: const TextStyle(
                          fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                    if (widget.firstOrderDiscountApplied &&
                        widget.discount > 0)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          'First-order 10% off: −₹${widget.discount.toStringAsFixed(0)}',
                          style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: AppColors.success),
                        ),
                      ),
                    if ((widget.couponCode ?? '').isNotEmpty &&
                        widget.discount > 0)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          'Coupon ${widget.couponCode}: −₹${widget.discount.toStringAsFixed(0)}',
                          style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: AppColors.success),
                        ),
                      ),
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        widget.deliveryFee > 0
                            ? 'Delivery: +₹${widget.deliveryFee.toStringAsFixed(0)}'
                            : 'Delivery: FREE',
                        style: const TextStyle(
                            fontSize: 10, color: AppColors.textMuted),
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: <Widget>[
                  const Text('TOTAL',
                      style: TextStyle(
                          fontSize: 9,
                          letterSpacing: 1,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textMuted)),
                  Text(
                    '₹${widget.totalAmount.toStringAsFixed(0)}',
                    style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: AppColors.brandRed),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Text(
            'Thank you — your order will be ready before you reach the shop.',
            textAlign: TextAlign.center,
            style: TextStyle(
                fontSize: 10,
                fontStyle: FontStyle.italic,
                color: AppColors.textMuted),
          ),
        ],
      ),
    );
  }

  Widget _buildAlertBanner() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF7DA),
        border: Border.all(color: const Color(0xFFF0DC8A)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Container(
            width: 28,
            height: 28,
            decoration: const BoxDecoration(
              color: AppColors.brandRed,
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: const Text('!',
                style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 14)),
          ),
          const SizedBox(width: 10),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Text('Last step — alert the shop owner',
                    style: TextStyle(fontWeight: FontWeight.w700)),
                Text(
                  "Press the green button below to send your order details to the owner on WhatsApp. Without this, the shop won't know your order.",
                  style: TextStyle(fontSize: 12, color: AppColors.textPrimary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAlertButton() {
    return FilledButton.icon(
      onPressed: _alertShopOnWhatsApp,
      icon: const Icon(LucideIcons.messageCircle, color: Colors.white),
      label: Text(
        _notified ? 'Re-send to shop on WhatsApp' : 'Alert shop on WhatsApp',
        style: const TextStyle(fontWeight: FontWeight.w800),
      ),
      style: FilledButton.styleFrom(
        backgroundColor: const Color(0xFF25D366),
        minimumSize: const Size.fromHeight(54),
      ),
    );
  }

  Widget _kv(String k, String v, {bool mono = false, bool alignRight = false}) {
    return Column(
      crossAxisAlignment:
          alignRight ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      children: <Widget>[
        Text(k,
            style: const TextStyle(
                fontSize: 9,
                letterSpacing: 1,
                fontWeight: FontWeight.w800,
                color: AppColors.textMuted)),
        Text(v,
            style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 12,
                fontFamily: mono ? 'monospace' : null)),
      ],
    );
  }
}
