import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../app/theme.dart';
import '../../core/api_client.dart';
import '../../data/models/address.dart';
import '../../data/repositories/profile_repository.dart';

class AddressesScreen extends StatefulWidget {
  const AddressesScreen({super.key});
  @override
  State<AddressesScreen> createState() => _AddressesScreenState();
}

class _AddressesScreenState extends State<AddressesScreen> {
  List<CustomerAddress>? _addresses;
  String? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final List<CustomerAddress> list =
          await ProfileRepository.instance.listAddresses();
      if (!mounted) return;
      setState(() {
        _addresses = list;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = ApiClient.describeError(e));
    }
  }

  Future<void> _editOrCreate({CustomerAddress? existing}) async {
    final TextEditingController labelCtl =
        TextEditingController(text: existing?.label ?? 'Home');
    final TextEditingController addrCtl =
        TextEditingController(text: existing?.address ?? '');
    bool isDefault = existing?.isDefault ?? false;
    final String? saved = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (BuildContext c) => Padding(
        padding: EdgeInsets.fromLTRB(
          20, 20, 20, MediaQuery.of(c).viewInsets.bottom + 20,
        ),
        child: StatefulBuilder(
          builder: (BuildContext c, StateSetter setSt) {
            return Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Text(
                  existing == null ? 'Add address' : 'Edit address',
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: labelCtl,
                  decoration: const InputDecoration(
                    labelText: 'Label (Home / Office / Other)',
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: addrCtl,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Address'),
                ),
                const SizedBox(height: 8),
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  value: isDefault,
                  onChanged: (bool? v) =>
                      setSt(() => isDefault = v ?? false),
                  title: const Text('Set as default'),
                  controlAffinity: ListTileControlAffinity.leading,
                  activeColor: AppColors.brandRed,
                ),
                const SizedBox(height: 8),
                FilledButton(
                  onPressed: () => Navigator.of(c).pop('save'),
                  child: const Text('Save'),
                ),
              ],
            );
          },
        ),
      ),
    );
    if (saved != 'save') return;
    if (addrCtl.text.trim().length < 5) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Address looks too short.')),
      );
      return;
    }
    setState(() => _busy = true);
    try {
      if (existing == null) {
        await ProfileRepository.instance.createAddress(
          label: labelCtl.text.trim(),
          address: addrCtl.text.trim(),
          isDefault: isDefault,
        );
      } else {
        await ProfileRepository.instance.updateAddress(existing.id, <String, dynamic>{
          'label': labelCtl.text.trim(),
          'address': addrCtl.text.trim(),
          'lat': existing.lat,
          'lng': existing.lng,
          'is_default': isDefault,
        });
      }
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ApiClient.describeError(e))),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _delete(CustomerAddress a) async {
    final bool? ok = await showDialog<bool>(
      context: context,
      builder: (BuildContext c) => AlertDialog(
        title: const Text('Delete address?'),
        content: Text(a.address),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(c).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(c).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ProfileRepository.instance.deleteAddress(a.id);
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ApiClient.describeError(e))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Saved addresses'),
        actions: <Widget>[
          IconButton(
            icon: const Icon(LucideIcons.plus),
            onPressed: _busy ? null : () => _editOrCreate(),
          ),
        ],
      ),
      body: _addresses == null && _error == null
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : _addresses!.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: <Widget>[
                          const Icon(LucideIcons.mapPin,
                              size: 48, color: AppColors.textMuted),
                          const SizedBox(height: 8),
                          const Text('No addresses saved yet.'),
                          const SizedBox(height: 12),
                          OutlinedButton.icon(
                            onPressed: () => _editOrCreate(),
                            icon: const Icon(LucideIcons.plus),
                            label: const Text('Add address'),
                          ),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                      itemCount: _addresses!.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (BuildContext c, int i) {
                        final CustomerAddress a = _addresses![i];
                        return Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Row(
                            children: <Widget>[
                              Container(
                                width: 36,
                                height: 36,
                                decoration: BoxDecoration(
                                  color: AppColors.surfaceAlt,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                alignment: Alignment.center,
                                child: const Icon(LucideIcons.mapPin,
                                    color: AppColors.brandRed, size: 18),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: <Widget>[
                                    Row(
                                      children: <Widget>[
                                        Text(a.label,
                                            style: const TextStyle(
                                                fontWeight:
                                                    FontWeight.w800)),
                                        if (a.isDefault) ...<Widget>[
                                          const SizedBox(width: 6),
                                          Container(
                                            padding: const EdgeInsets
                                                .symmetric(
                                                horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: AppColors.brandRed,
                                              borderRadius:
                                                  BorderRadius.circular(4),
                                            ),
                                            child: const Text(
                                              'DEFAULT',
                                              style: TextStyle(
                                                color: Colors.white,
                                                fontSize: 9,
                                                fontWeight: FontWeight.w800,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                    Text(a.address,
                                        style: const TextStyle(
                                            color: AppColors.textMuted)),
                                  ],
                                ),
                              ),
                              PopupMenuButton<String>(
                                onSelected: (String s) {
                                  if (s == 'edit') {
                                    _editOrCreate(existing: a);
                                  } else if (s == 'delete') {
                                    _delete(a);
                                  }
                                },
                                itemBuilder: (_) =>
                                    const <PopupMenuEntry<String>>[
                                  PopupMenuItem<String>(
                                      value: 'edit', child: Text('Edit')),
                                  PopupMenuItem<String>(
                                      value: 'delete', child: Text('Delete')),
                                ],
                              ),
                            ],
                          ),
                        );
                      },
                    ),
    );
  }
}
