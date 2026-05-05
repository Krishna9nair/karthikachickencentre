import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../app/theme.dart';
import '../../core/api_client.dart';
import '../../core/auth_storage.dart';
import '../../data/repositories/wheel_repository.dart';

/// Mirrors the website's `SundayWheel.jsx` 1:1 — same 6 segments in the
/// same order, same animated spin, same prize / coupon-copy reveal.
class SundayWheelDialog extends StatefulWidget {
  const SundayWheelDialog({super.key});
  @override
  State<SundayWheelDialog> createState() => _SundayWheelDialogState();
}

class _Segment {
  const _Segment(this.label, this.short, this.color);
  final String label;
  final String short;
  final Color color;
}

const List<_Segment> _segments = <_Segment>[
  _Segment('5% OFF', '5%', Color(0xFFD32F2F)),
  _Segment('10% OFF', '10%', Color(0xFFF5A623)),
  _Segment('15% OFF', '15%', Color(0xFF2E7D32)),
  _Segment('Try Again', 'Better luck', Color(0xFF616161)),
  _Segment('₹50 OFF', '₹50', Color(0xFF1976D2)),
  _Segment('₹75 OFF', '₹75', Color(0xFF8E24AA)),
];

const double _segDeg = 360 / 6; // 60°

class _SundayWheelDialogState extends State<SundayWheelDialog>
    with SingleTickerProviderStateMixin {
  late final TextEditingController _phone =
      TextEditingController(text: AuthStorage.instance.phone ?? '');
  late final AnimationController _spinCtl = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 4500),
  );
  late Animation<double> _rotation =
      Tween<double>(begin: 0, end: 0).animate(_spinCtl);

  String _status = 'checking'; // checking | ready | already_spun | not_sunday | disabled | done
  bool _spinning = false;
  Map<String, dynamic>? _prize;

  Timer? _statusDebounce;

  @override
  void initState() {
    super.initState();
    _checkStatus();
  }

  @override
  void dispose() {
    _phone.dispose();
    _spinCtl.dispose();
    _statusDebounce?.cancel();
    super.dispose();
  }

  Future<void> _checkStatus() async {
    setState(() {
      _status = 'checking';
      _prize = null;
    });
    final Map<String, dynamic> data =
        await WheelRepository.instance.status(phone: _phone.text);
    if (!mounted) return;
    if (data['is_sunday'] != true) {
      setState(() => _status = 'not_sunday');
      return;
    }
    if (data['reason'] == 'disabled') {
      setState(() => _status = 'disabled');
      return;
    }
    if (data['reason'] == 'already_spun') {
      setState(() {
        _status = 'already_spun';
        _prize = data['prize'] is Map
            ? Map<String, dynamic>.from(data['prize'] as Map<dynamic, dynamic>)
            : null;
      });
      return;
    }
    setState(() => _status = 'ready');
  }

  void _onPhoneChanged(String _) {
    _statusDebounce?.cancel();
    _statusDebounce = Timer(const Duration(milliseconds: 600), _checkStatus);
  }

  Future<void> _spin() async {
    if (_phone.text.length != 10) return;
    setState(() => _spinning = true);
    try {
      final Map<String, dynamic> result =
          await WheelRepository.instance.spin(_phone.text);
      if (result['already_spun'] == true) {
        if (!mounted) return;
        setState(() {
          _spinning = false;
          _status = 'already_spun';
          _prize = result['prize'] is Map
              ? Map<String, dynamic>.from(result['prize'] as Map<dynamic, dynamic>)
              : null;
        });
        return;
      }
      final int idx = (result['segment_index'] as num? ?? 0).toInt();
      // Land the centre of segment[idx] under the top pointer.
      // Total: 6 full rotations + offset to segment centre.
      final double targetDeg = 360 * 6 + (360 - (idx * _segDeg + _segDeg / 2));
      _rotation = Tween<double>(begin: 0, end: targetDeg).animate(
        CurvedAnimation(parent: _spinCtl, curve: Curves.easeOutCubic),
      );
      _spinCtl.forward(from: 0).whenComplete(() {
        if (!mounted) return;
        setState(() {
          _prize = result['prize'] is Map
              ? Map<String, dynamic>.from(result['prize'] as Map<dynamic, dynamic>)
              : null;
          _spinning = false;
          _status = 'done';
        });
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _spinning = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ApiClient.describeError(e))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      insetPadding: const EdgeInsets.all(16),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            _buildHeader(),
            Padding(
              padding: const EdgeInsets.all(16),
              child: _buildBody(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: <Color>[Color(0xFFFFF7DA), Color(0xFFFFE7B0)],
        ),
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
      child: Row(
        children: <Widget>[
          const Icon(LucideIcons.partyPopper, color: AppColors.brandRed),
          const SizedBox(width: 8),
          Expanded(
            child: Text('Sunday Lucky Spin',
                style: Theme.of(context).textTheme.titleLarge),
          ),
          IconButton(
            onPressed: _spinning ? null : () => Navigator.of(context).pop(),
            icon: const Icon(LucideIcons.x),
          ),
        ],
      ),
    );
  }

  Widget _buildBody() {
    switch (_status) {
      case 'not_sunday':
        return _buildMessage(
          icon: '🎡',
          title: 'Come back this Sunday!',
          body: 'The lucky wheel only spins on Sundays. Win up to 15% off '
              'or ₹75 off your next order.',
        );
      case 'disabled':
        return _buildMessage(
          icon: '⏸',
          title: 'Wheel is paused',
          body: "It'll be back next Sunday — keep an eye out!",
        );
      case 'already_spun':
        return _buildAlreadySpun();
      default:
        return _buildSpinUI();
    }
  }

  Widget _buildSpinUI() {
    return Column(
      children: <Widget>[
        _buildWheel(),
        const SizedBox(height: 18),
        if (_status == 'done' && _prize != null)
          _buildPrizeReveal(_prize!)
        else
          _buildPhoneInput(),
      ],
    );
  }

  Widget _buildWheel() {
    return SizedBox(
      width: 280,
      height: 280,
      child: Stack(
        alignment: Alignment.center,
        children: <Widget>[
          // Pointer (top)
          Positioned(
            top: -2,
            child: CustomPaint(
              size: const Size(24, 18),
              painter: _PointerPainter(),
            ),
          ),
          // Wheel disc
          AnimatedBuilder(
            animation: _spinCtl,
            builder: (BuildContext c, _) => Transform.rotate(
              angle: _rotation.value * math.pi / 180,
              child: Container(
                width: 256,
                height: 256,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFF212121), width: 4),
                  boxShadow: <BoxShadow>[
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.2),
                      blurRadius: 20,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: ClipOval(
                  child: CustomPaint(
                    size: const Size(256, 256),
                    painter: _WheelPainter(),
                    child: Stack(
                      children: List<Widget>.generate(6, (int i) {
                        final double angle = i * _segDeg + _segDeg / 2;
                        return Center(
                          child: Transform.rotate(
                            angle: angle * math.pi / 180,
                            child: Transform.translate(
                              offset: const Offset(0, -90),
                              child: Transform.rotate(
                                angle: math.pi / 2,
                                child: Text(
                                  _segments[i].short,
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800,
                                    shadows: <Shadow>[
                                      Shadow(
                                        color: Colors.black54,
                                        offset: Offset(1, 1),
                                        blurRadius: 2,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                  ),
                ),
              ),
            ),
          ),
          // Centre hub
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              border: Border.all(color: const Color(0xFF212121), width: 4),
            ),
            alignment: Alignment.center,
            child: const Icon(LucideIcons.sparkles,
                color: AppColors.brandRed, size: 22),
          ),
        ],
      ),
    );
  }

  Widget _buildPhoneInput() {
    final bool canSpin = _phone.text.length == 10 && !_spinning;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const Align(
          alignment: Alignment.centerLeft,
          child: Text('Your phone number',
              style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
        ),
        const SizedBox(height: 4),
        TextField(
          controller: _phone,
          keyboardType: TextInputType.number,
          inputFormatters: <TextInputFormatter>[
            FilteringTextInputFormatter.digitsOnly,
            LengthLimitingTextInputFormatter(10),
          ],
          enabled: !_spinning,
          decoration: const InputDecoration(
            hintText: '10-digit mobile',
            prefixText: '+91 ',
          ),
          onChanged: _onPhoneChanged,
        ),
        const SizedBox(height: 10),
        FilledButton.icon(
          onPressed: canSpin ? _spin : null,
          icon: _spinning
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                      color: Colors.white, strokeWidth: 2))
              : const Icon(LucideIcons.sparkles),
          label: Text(_spinning ? 'Spinning…' : 'SPIN THE WHEEL'),
        ),
        const SizedBox(height: 6),
        const Text(
          'One spin per phone, every Sunday. Win coupons valid for 7 days.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 11, color: AppColors.textMuted),
        ),
      ],
    );
  }

  Widget _buildPrizeReveal(Map<String, dynamic> prize) {
    final String label = (prize['label'] ?? '').toString();
    final String? code = prize['coupon_code']?.toString();
    final num value = (prize['value'] as num? ?? 0);
    final bool isWin = prize['kind'] != 'none' && value > 0;
    return Column(
      children: <Widget>[
        Text(isWin ? '🎉' : '🤞', style: const TextStyle(fontSize: 36)),
        Text(isWin ? 'You won!' : 'So close…',
            style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(
              color: AppColors.brandRed,
              fontWeight: FontWeight.w800,
              fontSize: 16),
        ),
        if (isWin && code != null && code.isNotEmpty) ...<Widget>[
          const SizedBox(height: 10),
          _CouponPill(code: code),
          const SizedBox(height: 6),
          const Text('Use this code at checkout — valid for 7 days',
              style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
        ] else ...<Widget>[
          const SizedBox(height: 8),
          const Text("Don't worry — come back next Sunday for another spin!",
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textMuted)),
        ],
      ],
    );
  }

  Widget _buildAlreadySpun() {
    final Map<String, dynamic>? prize = _prize;
    if (prize == null) {
      return _buildMessage(
        icon: '🎡',
        title: 'You already spun today',
        body: 'Come back next Sunday for another spin!',
      );
    }
    final num value = (prize['prize_value'] as num? ?? prize['value'] as num? ?? 0);
    final bool isWin =
        (prize['prize_kind'] ?? prize['kind']) != 'none' && value > 0;
    final String label =
        (prize['prize_label'] ?? prize['label'] ?? '').toString();
    final String? code = prize['coupon_code']?.toString();
    return Column(
      children: <Widget>[
        Text(isWin ? '🎉' : '🤞', style: const TextStyle(fontSize: 36)),
        const SizedBox(height: 4),
        Text('You already spun today!',
            style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 4),
        Text(
          'Your prize: $label',
          style: const TextStyle(color: AppColors.brandRed, fontWeight: FontWeight.w700),
        ),
        if (isWin && code != null && code.isNotEmpty) ...<Widget>[
          const SizedBox(height: 12),
          _CouponPill(code: code),
        ],
      ],
    );
  }

  Widget _buildMessage({
    required String icon,
    required String title,
    required String body,
  }) {
    return Column(
      children: <Widget>[
        Text(icon, style: const TextStyle(fontSize: 36)),
        const SizedBox(height: 6),
        Text(title, style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 4),
        Text(body,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.textMuted)),
      ],
    );
  }
}

class _CouponPill extends StatefulWidget {
  const _CouponPill({required this.code});
  final String code;
  @override
  State<_CouponPill> createState() => _CouponPillState();
}

class _CouponPillState extends State<_CouponPill> {
  bool _copied = false;

  Future<void> _copy() async {
    await Clipboard.setData(ClipboardData(text: widget.code));
    if (!mounted) return;
    setState(() => _copied = true);
    Future<void>.delayed(const Duration(milliseconds: 1800), () {
      if (mounted) setState(() => _copied = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(
          color: AppColors.brandRed,
          width: 2,
          style: BorderStyle.solid,
        ),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Text(
            widget.code,
            style: const TextStyle(
              fontFamily: 'monospace',
              fontWeight: FontWeight.w800,
              fontSize: 18,
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(width: 10),
          IconButton(
            onPressed: _copy,
            iconSize: 18,
            visualDensity: VisualDensity.compact,
            icon: Icon(
              _copied ? Icons.check_rounded : Icons.copy_rounded,
              color: _copied ? AppColors.success : AppColors.brandRed,
            ),
          ),
        ],
      ),
    );
  }
}

class _PointerPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final Path path = Path()
      ..moveTo(size.width / 2, size.height)
      ..lineTo(0, 0)
      ..lineTo(size.width, 0)
      ..close();
    final Paint p = Paint()..color = const Color(0xFF212121);
    canvas.drawPath(path, p);
  }

  @override
  bool shouldRepaint(covariant _PointerPainter oldDelegate) => false;
}

class _WheelPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double radius = size.width / 2;
    final Offset centre = Offset(radius, radius);
    final Rect rect = Rect.fromCircle(center: centre, radius: radius);
    for (int i = 0; i < _segments.length; i++) {
      final Paint p = Paint()..color = _segments[i].color;
      final double startRad = (i * _segDeg - 90) * math.pi / 180;
      canvas.drawArc(rect, startRad, _segDeg * math.pi / 180, true, p);
    }
  }

  @override
  bool shouldRepaint(covariant _WheelPainter oldDelegate) => false;
}
