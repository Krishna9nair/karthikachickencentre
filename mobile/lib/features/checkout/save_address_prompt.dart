import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../app/theme.dart';
import '../../core/api_client.dart';
import '../../core/auth_storage.dart';
import '../../data/models/address.dart';
import '../../data/repositories/profile_repository.dart';

/// Mirrors the website's `SaveAddressPrompt.jsx`.
///
/// After a customer successfully places an order, we show a small bottom
/// sheet asking whether they'd like to save the address they just used to
/// their profile so it's pre-filled next time. Only shown for signed-in
/// users (anonymous customers don't have a saved-address concept).
///
/// Returns `true` if the address was saved, `false` if dismissed.
class SaveAddressPrompt {
  SaveAddressPrompt._();

  static Future<bool> showIfRelevant(
    BuildContext context, {
    required String address,
    String label = 'Home',
  }) async {
    if (!AuthStorage.instance.isAuthenticated) return false;
    if (!AuthStorage.instance.hasLinkedPhone) return false;
    if (address.trim().length < 5) return false;

    // Skip if already saved (case-insensitive equality on trimmed form).
    try {
      final List<CustomerAddress> existing =
          await ProfileRepository.instance.listAddresses();
      final String normalized = address.trim().toLowerCase();
      final bool dup = existing.any((CustomerAddress a) =>
          a.address.trim().toLowerCase() == normalized);
      if (dup) return false;
    } catch (_) {/* fall through and prompt anyway */}

    if (!context.mounted) return false;
    final bool? saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (BuildContext c) => _SaveAddressSheet(
        address: address.trim(),
        defaultLabel: label,
      ),
    );
    return saved == true;
  }
}

class _SaveAddressSheet extends StatefulWidget {
  const _SaveAddressSheet({
    required this.address,
    required this.defaultLabel,
  });
  final String address;
  final String defaultLabel;
  @override
  State<_SaveAddressSheet> createState() => _SaveAddressSheetState();
}

class _SaveAddressSheetState extends State<_SaveAddressSheet> {
  late final TextEditingController _label =
      TextEditingController(text: widget.defaultLabel);
  bool _setDefault = true;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _label.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ProfileRepository.instance.createAddress(
        label: _label.text.trim().isEmpty ? 'Home' : _label.text.trim(),
        address: widget.address,
        isDefault: _setDefault,
      );
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = ApiClient.describeError(e);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
          20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Container(
            width: 36,
            height: 4,
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: AppColors.border,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Row(
            children: <Widget>[
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.brandRed.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                alignment: Alignment.center,
                child: const Icon(LucideIcons.mapPin,
                    color: AppColors.brandRed, size: 18),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text('Save this address?',
                    style: Theme.of(context).textTheme.titleLarge),
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Text(
            "We'll pre-fill it next time so checkout is one tap.",
            style: TextStyle(color: AppColors.textMuted),
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.surfaceAlt,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(widget.address,
                style: const TextStyle(fontWeight: FontWeight.w600)),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _label,
            decoration: const InputDecoration(
              labelText: 'Label (Home / Office / Other)',
              prefixIcon: Icon(LucideIcons.tag),
            ),
          ),
          const SizedBox(height: 6),
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            value: _setDefault,
            onChanged: (bool? v) => setState(() => _setDefault = v ?? true),
            title: const Text('Make this my default address'),
            controlAffinity: ListTileControlAffinity.leading,
            activeColor: AppColors.brandRed,
            visualDensity: VisualDensity.compact,
          ),
          if (_error != null) ...<Widget>[
            const SizedBox(height: 4),
            Text(_error!, style: const TextStyle(color: AppColors.danger)),
          ],
          const SizedBox(height: 12),
          Row(
            children: <Widget>[
              Expanded(
                child: TextButton(
                  onPressed: _busy
                      ? null
                      : () => Navigator.of(context).pop(false),
                  child: const Text("Don't save"),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton(
                  onPressed: _busy ? null : _save,
                  child: _busy
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                              color: Colors.white, strokeWidth: 2))
                      : const Text('Save'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
