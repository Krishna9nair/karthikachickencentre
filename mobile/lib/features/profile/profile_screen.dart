import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../app/env.dart';
import '../../app/theme.dart';
import '../../core/api_client.dart';
import '../../core/auth_storage.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/profile_repository.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final bool authed = AuthStorage.instance.isAuthenticated;
    if (!authed) return _buildSignedOut();
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        children: <Widget>[
          _buildHeader(),
          if (!AuthStorage.instance.hasLinkedPhone) ...<Widget>[
            const SizedBox(height: 16),
            _buildLinkPhoneCard(),
          ],
          const SizedBox(height: 16),
          _tile(
            icon: LucideIcons.mapPin,
            label: 'Saved addresses',
            onTap: () => context.push('/profile/addresses'),
          ),
          _tile(
            icon: LucideIcons.userCog,
            label: 'Edit name',
            onTap: _editName,
          ),
          _tile(
            icon: LucideIcons.messageCircle,
            label: 'Chat with us on WhatsApp',
            onTap: _openWhatsApp,
          ),
          _tile(
            icon: LucideIcons.fileText,
            label: 'Terms of Service',
            onTap: () => context.push('/legal/terms'),
          ),
          _tile(
            icon: LucideIcons.shield,
            label: 'Privacy Policy',
            onTap: () => context.push('/legal/privacy'),
          ),
          _tile(
            icon: LucideIcons.refreshCcw,
            label: 'Cancellation Policy',
            onTap: () => context.push('/legal/cancellation'),
          ),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: _busy ? null : _signOut,
            icon: const Icon(LucideIcons.logOut, color: AppColors.danger),
            label: const Text('Sign out',
                style: TextStyle(color: AppColors.danger)),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AppColors.danger),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSignedOut() {
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              const Icon(LucideIcons.userCircle,
                  size: 56, color: AppColors.textMuted),
              const SizedBox(height: 12),
              const Text('Sign in to manage profile',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              const SizedBox(height: 4),
              const Text(
                'Track orders, save addresses, and reorder fast.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textMuted),
              ),
              const SizedBox(height: 18),
              FilledButton(
                onPressed: () => context.push('/login'),
                child: const Text('Sign in / Create account'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.brandRed.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: <Widget>[
          CircleAvatar(
            radius: 30,
            backgroundColor: AppColors.brandRed,
            child: Text(
              ((AuthStorage.instance.name ?? AuthStorage.instance.email ?? '?')
                      .isNotEmpty
                  ? (AuthStorage.instance.name ?? AuthStorage.instance.email!)[0]
                      .toUpperCase()
                  : '?'),
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w800,
                fontSize: 22,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Text(
                  AuthStorage.instance.name?.isNotEmpty == true
                      ? AuthStorage.instance.name!
                      : 'Welcome back',
                  style: const TextStyle(
                      fontWeight: FontWeight.w800, fontSize: 16),
                ),
                Text(AuthStorage.instance.email ?? '',
                    style: const TextStyle(color: AppColors.textMuted)),
                if (AuthStorage.instance.hasLinkedPhone)
                  Text('+91 ${AuthStorage.instance.phone}',
                      style: const TextStyle(color: AppColors.textMuted)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLinkPhoneCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.warning.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.warning.withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const Row(
            children: <Widget>[
              Icon(LucideIcons.phone, color: AppColors.warning),
              SizedBox(width: 8),
              Text('Link your phone',
                  style: TextStyle(fontWeight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            'Link your delivery phone to see past orders and saved addresses.',
            style: TextStyle(color: AppColors.textMuted),
          ),
          const SizedBox(height: 10),
          FilledButton(
            onPressed: _linkPhone,
            child: const Text('Link phone'),
          ),
        ],
      ),
    );
  }

  Widget _tile({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return ListTile(
      onTap: onTap,
      contentPadding: EdgeInsets.zero,
      leading: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: AppColors.surfaceAlt,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, size: 18, color: AppColors.brandRed),
      ),
      title: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
      trailing: const Icon(LucideIcons.chevronRight,
          size: 18, color: AppColors.textMuted),
    );
  }

  Future<void> _editName() async {
    final TextEditingController ctl =
        TextEditingController(text: AuthStorage.instance.name ?? '');
    final String? name = await showDialog<String>(
      context: context,
      builder: (BuildContext c) => AlertDialog(
        title: const Text('Edit name'),
        content: SizedBox(
          width: double.maxFinite,
          child: TextField(
            controller: ctl,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(labelText: 'Name'),
          ),
        ),
        actions: <Widget>[
          TextButton(
              onPressed: () => Navigator.of(c).pop(),
              child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.of(c).pop(ctl.text.trim()),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (name == null || name.isEmpty) return;
    if (!AuthStorage.instance.hasLinkedPhone) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Link a phone first.')),
      );
      return;
    }
    try {
      await ProfileRepository.instance.updateName(name);
      await AuthStorage.instance.updateProfile(name: name);
      if (!mounted) return;
      setState(() {});
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Name updated.')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ApiClient.describeError(e))),
      );
    }
  }

  Future<void> _linkPhone() async {
    final TextEditingController ctl = TextEditingController();
    final String? phone = await showDialog<String>(
      context: context,
      builder: (BuildContext c) => AlertDialog(
        title: const Text('Link phone'),
        content: SizedBox(
          width: double.maxFinite,
          child: TextField(
            controller: ctl,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: '10-digit phone',
              prefixText: '+91 ',
            ),
          ),
        ),
        actions: <Widget>[
          TextButton(
              onPressed: () => Navigator.of(c).pop(),
              child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.of(c)
                .pop(ctl.text.replaceAll(RegExp(r'\D'), '')),
            child: const Text('Link'),
          ),
        ],
      ),
    );
    if (phone == null || phone.length < 10) return;
    try {
      await AuthRepository.instance.linkPhone(phone);
      if (!mounted) return;
      setState(() {});
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Phone linked.')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ApiClient.describeError(e))),
      );
    }
  }

  Future<void> _signOut() async {
    setState(() => _busy = true);
    await AuthRepository.instance.logout();
    if (!mounted) return;
    setState(() => _busy = false);
    context.go('/home');
  }

  Future<void> _openWhatsApp() async {
    final Uri uri = Uri.parse('https://wa.me/${Env.shopWhatsApp}');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}
