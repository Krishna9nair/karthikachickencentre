import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../app/env.dart';
import '../../app/theme.dart';
import '../../core/api_client.dart';
import '../../core/auth_storage.dart';
import '../../data/repositories/reviews_repository.dart';

/// Mirrors the website's `ReviewDialog.jsx`. Lets the customer:
///   - pick a 1–5 star rating
///   - type a name + comment
///   - optionally enter their phone (auto-filled from AuthStorage)
///   - submit; on 4★ or 5★ ratings the dialog also offers a WhatsApp
///     share button to recommend the shop to a friend (organic referral).
class WriteReviewDialog extends StatefulWidget {
  const WriteReviewDialog({super.key, this.orderId, this.prefillName});
  final String? orderId;
  final String? prefillName;
  @override
  State<WriteReviewDialog> createState() => _WriteReviewDialogState();
}

class _WriteReviewDialogState extends State<WriteReviewDialog> {
  late final TextEditingController _name = TextEditingController(
      text: widget.prefillName ?? AuthStorage.instance.name ?? '');
  late final TextEditingController _phone =
      TextEditingController(text: AuthStorage.instance.phone ?? '');
  final TextEditingController _comment = TextEditingController();
  int _rating = 0;
  bool _busy = false;
  bool _submitted = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _comment.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_rating < 1) {
      setState(() => _error = 'Pick a star rating');
      return;
    }
    if (_name.text.trim().length < 2) {
      setState(() => _error = 'Enter your name');
      return;
    }
    if (_comment.text.trim().length < 4) {
      setState(() => _error = 'Tell us a bit more');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ReviewsRepository.instance.submit(
        name: _name.text.trim(),
        rating: _rating,
        comment: _comment.text.trim(),
        phone: _phone.text.trim(),
        orderId: widget.orderId,
      );
      if (!mounted) return;
      setState(() {
        _busy = false;
        _submitted = true;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = ApiClient.describeError(e);
      });
    }
  }

  Future<void> _shareOnWhatsApp() async {
    final String msg = Uri.encodeComponent(
        'I just ordered fresh chicken from Karthika Chicken Centre and loved it. '
        'You should try them too: https://karthikachickencentre.shop');
    final Uri uri = Uri.parse('https://wa.me/?text=$msg');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      contentPadding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
      title: Text(_submitted ? 'Thanks!' : 'Write a review'),
      content: SizedBox(
        width: double.maxFinite,
        child: _submitted ? _buildThanks() : _buildForm(),
      ),
      actions: _submitted
          ? <Widget>[
              FilledButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text('Done'),
              ),
            ]
          : <Widget>[
              TextButton(
                onPressed: _busy ? null : () => Navigator.of(context).pop(false),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: _busy ? null : _submit,
                child: _busy
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2))
                    : const Text('Submit'),
              ),
            ],
    );
  }

  Widget _buildForm() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Center(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: List<Widget>.generate(5, (int i) {
              final int n = i + 1;
              return IconButton(
                onPressed: () => setState(() => _rating = n),
                icon: Icon(
                  n <= _rating ? Icons.star_rounded : Icons.star_outline_rounded,
                  size: 32,
                  color: const Color(0xFFF5A623),
                ),
                padding: EdgeInsets.zero,
                splashRadius: 20,
              );
            }),
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _name,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(labelText: 'Your name'),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _phone,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(
              labelText: 'Phone (optional)', prefixText: '+91 '),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _comment,
          maxLines: 3,
          decoration: const InputDecoration(
            labelText: 'How was the chicken?',
            hintText: 'Fresh? Tender? Quick delivery?',
          ),
        ),
        if (_error != null) ...<Widget>[
          const SizedBox(height: 10),
          Text(_error!, style: const TextStyle(color: AppColors.danger)),
        ],
      ],
    );
  }

  Widget _buildThanks() {
    final bool happyShare = _rating >= 4;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        const Icon(Icons.check_circle_rounded,
            color: AppColors.success, size: 48),
        const SizedBox(height: 8),
        const Text(
          'Your review will appear once approved.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.textMuted),
        ),
        if (happyShare) ...<Widget>[
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: _shareOnWhatsApp,
            icon: const Icon(LucideIcons.messageCircle,
                color: Color(0xFF25D366)),
            label: const Text('Share with neighbours on WhatsApp'),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Color(0xFF25D366)),
            ),
          ),
        ],
        const SizedBox(height: 4),
        Text(
          'Posted by ${_name.text.trim()} from ${Env.appName}',
          style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
        ),
      ],
    );
  }
}
